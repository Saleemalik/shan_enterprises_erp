import os
from .models import Dealer, Place, Destination, RateRange, DestinationEntry, RangeEntry, DealerEntry, ServiceBill
from .serializers import DealerSerializer, PlaceSerializer, DestinationSerializer, RateRangeSerializer, DestinationEntrySerializer, DestinationEntryWriteSerializer, DestinationEntryDetailSerializer, TransportDepotDealerEntrySerializer, ServiceBillCreateSerializer
from django.db.models import Q
from .base import AppBaseViewSet, BaseViewSet
import pandas as pd
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import APIView

from django.db.models import Prefetch
from django.http import FileResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether
from io import BytesIO
from num2words import num2words
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import Flowable, Paragraph, KeepTogether
from collections import defaultdict
from .utils import fmt_km



def safe_float(val):
    if pd.isna(val):
        return 0
    val = str(val).strip()
    if val == "" or val.lower() == "nil" or val == "-":
        return 0
    try:
        return float(val)
    except:
        return 0
class BreakableRangeBlock(Flowable):

    def __init__(self, title, title_cont, table, style, is_continuation=False):
        super().__init__()
        self.title = title
        self.title_cont = title_cont
        self.table = table
        self.style = style
        self.is_continuation = is_continuation

        self.width = 0
        self.height = 0
        self.top_padding = 2
        self.bottom_padding = 4

    def wrap(self, availWidth, availHeight):
        self.width = availWidth

        # Normal title
        p = Paragraph(self.title, self.style)
        _, self.title_h = p.wrap(availWidth, availHeight)

        # Continuation title
        pc = Paragraph(self.title_cont, self.style)
        _, self.cont_h = pc.wrap(availWidth, availHeight)

        # Measure table height for THIS block only
        _, table_h = self.table.wrap(availWidth, availHeight)
        self.table_h = table_h

        # Use cont height only if split
        title_h = self.cont_h if self.is_continuation else self.title_h

        # Full block height
        self.height = title_h + self.top_padding + self.table_h + self.bottom_padding

        return (availWidth, self.height)

    def split(self, availWidth, availHeight):

        # compute title height
        title_h = self.cont_h if self.is_continuation else self.title_h

        space_after_title = availHeight - title_h - self.top_padding - self.bottom_padding

        if space_after_title <= 0:
            # not enough room → move whole block to next page
            return []

        # Ask table to split
        parts = self.table.split(availWidth, space_after_title)

        if not parts or len(parts) == 1:
            # Nothing to split
            return []

        # FIRST part → (continuation only if parent was continuation)
        first = BreakableRangeBlock(
            self.title,
            self.title_cont,
            parts[0],
            self.style,
            is_continuation=self.is_continuation
        )

        # SECOND part → always continuation
        second = BreakableRangeBlock(
            self.title,
            self.title_cont,
            parts[1],
            self.style,
            is_continuation=True
        )

        return [first, second]

    def draw(self):
        # Select proper heading
        if self.is_continuation:
            p = Paragraph(self.title_cont, self.style)
            title_h = self.cont_h
        else:
            p = Paragraph(self.title, self.style)
            title_h = self.title_h

        w, h = p.wrap(self.width, title_h)

        # Draw at top
        p.drawOn(self.canv, (self.width - w) / 2, self.table_h + self.bottom_padding)

        # Draw table
        self.table.drawOn(self.canv, 0, 0)
class PlaceViewSet(AppBaseViewSet):
    queryset = Place.objects.all().order_by("name")
    serializer_class = PlaceSerializer
    search_fields = ['name', 'district', 'destination__name']      
    ordering_fields = ['name', 'distance', 'district', 'destination__name']  
    
    def list(self, request, *args, **kwargs):
        if request.query_params.get("all") == "1":
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({"results": serializer.data})
        return super().list(request, *args, **kwargs)


class DealerViewSet(AppBaseViewSet):
    queryset = Dealer.objects.all().order_by("code")
    serializer_class = DealerSerializer
    search_fields = ["name", "code", "mobile", "places__name", "places__destination__name"]
    ordering_fields = ["name", "code"]

    @action(detail=False, methods=["post"], url_path="import_excel")
    def import_excel(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded"}, status=400)

        try:
            # Load workbook with sheet names
            excel = pd.ExcelFile(file)
        except Exception as e:
            return Response({"error": f"Unable to read Excel: {e}"}, status=400)

        created_dealers = 0
        created_places = 0
        created_destinations = 0
        
        def clean_number(val):
            """Clean mobile/pincode values from Excel"""
            if pd.isna(val):
                return ""
            
            s = str(val).strip()

            # Remove trailing .0 (Excel float)
            if s.endswith(".0"):
                s = s[:-2]

            # Remove spaces
            s = s.replace(" ", "")

            # Convert scientific notation (e.g., 6.78E5)
            if "e" in s.lower():
                try:
                    s = str(int(float(s)))
                except:
                    pass

            return s


        with transaction.atomic():
            for sheet_name in excel.sheet_names:

                df = pd.read_excel(excel, sheet_name=sheet_name)
                
                if df.empty or len(df.columns) == 0:
                    print(f"Skipping empty sheet: {sheet_name}")
                    continue

                # Clean column names
                df.columns = df.columns.str.lower().str.strip()

                # Required columns
                required_cols = {
                    "code": ["code", "dealer code", "Customer No"],
                    "name": ["name", "dealer name", "Name 1"],
                    "mobile": ["mobile", "phone", "mob no.", "mob.no."],
                    "pincode": ["pincode", "pin", "pin code"],
                    "place": ["place", "Unloading Point"],
                    "distance": ["distance", "km","Distance from Rail Head", "RH Distance"]
                }
                col_map = {}
                
                for field, possible in required_cols.items():
                    found = None
                    for col in df.columns:
                        if col in [p.lower() for p in possible]:
                            found = col
                            break
                    if not found:
                        return Response(
                            {"error": f"Column '{field}' missing in sheet '{sheet_name}'. Expected one of {possible}"},
                            status=400
                        )
                    col_map[field] = found

            
                # Destination
                destination_name = f"{sheet_name} FOL"
                destination, created = Destination.objects.get_or_create(
                    name=destination_name, place=sheet_name, defaults={"is_garage": False}
                )
                if created:
                    created_destinations += 1
                    

                # Loop rows
                for _, row in df.iterrows():

                    # ---- SAFE distance handling ----
                    raw_distance = row[col_map["distance"]]
                    distance_value = safe_float(raw_distance)

                    # ---- Get/Create Place ----
                    place, place_created = Place.objects.get_or_create(
                        name=str(row[col_map["place"]]).strip(),
                        district=sheet_name if sheet_name != "Sheet1" else None,
                        destination=destination,
                        defaults={"distance": distance_value}
                    )
                    if place_created:
                        created_places += 1

                    # ---- Get/Create Dealer ----
                    dealer, dealer_created = Dealer.objects.get_or_create(
                        code=str(row[col_map["code"]]).strip(),
                        defaults={
                            "name": str(row[col_map["name"]]).strip(),
                            "mobile": clean_number(row[col_map["mobile"]]),
                            "pincode": clean_number(row[col_map["pincode"]]),

                        }
                    )
                    if dealer_created:
                        created_dealers += 1

                    # ---- Add place M2M ----
                    dealer.places.add(place)

        return Response({
            "status": "success",
            "dealers_created": created_dealers,
            "places_created": created_places,
            "destinations_created": created_destinations,
        }, status=200)
        
    @action(detail=False, methods=["GET"])
    def filter_by_range(self, request):
        range_id = request.query_params.get("range_id")
        if not range_id:
            return Response({"error": "range_id required"}, status=400)

        try:
            rr = RateRange.objects.get(id=range_id)
        except RateRange.DoesNotExist:
            return Response({"error": "Range not found"}, status=404)

        destination_id = request.query_params.get("destination_id")

        # --- THE FIX: Query places first ---
        place_qs = Place.objects.filter(
            distance__gte=rr.from_km,
            distance__lte=rr.to_km
        )

        if destination_id:
            place_qs = place_qs.filter(destination_id=destination_id)

        # Return dealers matched to each place individually
        rows = place_qs.values(
            "id",
            "name",
            "distance",
            "dealers__id",
            "dealers__name",
        ).order_by("distance", "dealers__name")

        results = []
        for r in rows:
            results.append({
                "dealer_id": r["dealers__id"],
                "dealer_name": r["dealers__name"],
                "place_id": r["id"],
                "place_name": r["name"],
                "distance": r["distance"],
            })

        return Response(results)
    

    
    @action(detail=False, methods=["GET"], url_path="by-destination")
    def by_destination(self, request):
        dest_id = request.query_params.get("destination_id")
        if not dest_id:
            return Response({"detail": "destination_id is required"}, status=400)

        search = request.query_params.get("search", "").strip().lower()

        # Prefetch dealers for places (unfiltered so we can match dealer names too)
        dealer_prefetch = Prefetch(
            "dealers",
            queryset=Dealer.objects.filter(active=True).order_by("name"),
            to_attr="prefetched_dealers"
        )

        # Get all places for destination (we will apply search logic in Python)
        places = Place.objects.filter(destination_id=dest_id).prefetch_related(dealer_prefetch).order_by("distance")

        results = []

        for place in places:
            place_matches = False
            if search:
                # check place-level match
                if search in (place.name or "").lower() or search in (place.district or "").lower():
                    place_matches = True

            for dealer in getattr(place, "prefetched_dealers", []):
                # If there's a search term, allow match if either dealer or place matches
                if search:
                    dealer_matches = (
                        search in (dealer.name or "").lower() or
                        search in (dealer.code or "").lower()
                    )
                    if not (dealer_matches or place_matches):
                        continue  # skip this pair
                # find RateRange for this place distance
                rr = RateRange.objects.filter(
                    from_km__lte=place.distance,
                    to_km__gte=place.distance
                ).first()

                results.append({
                    "dealer_id": dealer.id,
                    "dealer_code": dealer.code,
                    "dealer_name": dealer.name,
                    "place_id": place.id,
                    "place_name": place.name,
                    "distance": place.distance,
                    "district": place.district,
                    "rate_range_id": rr.id if rr else None,
                    "rate": rr.rate if rr else None,
                    "is_mtk": rr.is_mtk if rr else None,
                })

        # sort and return
        results.sort(key=lambda x: (x["distance"] or 0, x["dealer_name"] or ""))

        return Response(results)

class RateRangeViewSet(AppBaseViewSet):
    queryset = RateRange.objects.all().order_by("from_km")
    serializer_class = RateRangeSerializer
    search_fields = ['from_km', 'to_km']        
    ordering_fields = ['from_km', 'to_km']

class DestinationViewSet(AppBaseViewSet):
    queryset = Destination.objects.all().order_by("name")
    serializer_class = DestinationSerializer
    search_fields = ['name', 'place']        
    ordering_fields = ['name']  
    

class DestinationEntryViewSet(BaseViewSet):
    queryset = DestinationEntry.objects.all().order_by("-id")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return DestinationEntryWriteSerializer
        return DestinationEntrySerializer

    # Custom action to create nested entry
    @action(detail=False, methods=["post"], url_path="create-full")
    def create_full(self, request):
        serializer = DestinationEntryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dest_entry = serializer.save()
        return Response({"id": dest_entry.id}, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = DestinationEntryDetailSerializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=["GET"])
    def print(self, request, pk=None):
        pdf_bytes = self.generate_pdf(pk)  # we re-use your logic below

        return FileResponse(
            pdf_bytes,
            as_attachment=False,
            filename=f"destination-entry-{pk}.pdf",
            content_type="application/pdf",
        )


    def generate_pdf(self, entry_id):

        # fetch main entry
        entry = DestinationEntry.objects.select_related("destination").get(id=entry_id)
        destination = entry.destination
        bill_number = entry.bill_number
        date = entry.date
        letter_note = entry.letter_note
        to_address = entry.to_address

        # pdf setup
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=20,
            rightMargin=20,
            topMargin=120,
            bottomMargin=80,
        )

        # STYLES
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Small', fontSize=8, leading=10))
        styles.add(ParagraphStyle(name='NormalBold', fontSize=10, leading=11, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='TitleBold', fontSize=13, leading=14, fontName='Helvetica-Bold', alignment=TA_LEFT))
        styles.add(ParagraphStyle(name='CustomNormal', fontSize=10, leading=12))
        styles.add(ParagraphStyle(name='CenterBold', fontSize=10, fontName='Helvetica-Bold', alignment=TA_CENTER))

        elements = []

        # helper trim
        def trim(text, max_len=32):
            if not text:
                return ""
            return text if len(text) <= max_len else text[:max_len] + "…"

        # company header
        left_column = [
            Paragraph("GSTIN: 32ACNFS 8060K1ZP", styles['Small']),
            Paragraph("M/s. SHAN ENTERPRISES", styles['TitleBold']),
            Paragraph("Clearing & Transporting contractor", styles['CustomNormal']),
            Paragraph("21-4185, C-Meenchanda gate Calicut - 673018", styles['CustomNormal']),
            Paragraph("Mob: 9447004108", styles['CustomNormal']),
        ]

        to_split = to_address.split("\n") if to_address else []
        right_column = [Paragraph(line, styles['CustomNormal']) for line in to_split] + [
            Spacer(1, 4),
            Paragraph(f"Date: {date}", styles['CustomNormal']),
        ]

        # BILL BLOCK
        elements.append(Paragraph(f"Bill No.: {bill_number}", styles["CustomNormal"]))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("Sir,", styles["CustomNormal"]))
        elements.append(Paragraph(letter_note if letter_note else "Please find the details below:", styles["CustomNormal"]))
        elements.append(Spacer(1, 10))

        # ranges
        ranges = RangeEntry.objects.filter(destination_entry=entry)

        page_width, _ = landscape(A4)
        usable_width = page_width - doc.leftMargin - doc.rightMargin
        
        def clean_km(v):
            return int(v) if float(v).is_integer() else v

        for range_entry in ranges:
            rr = RateRange.objects.get(id=range_entry.rate_range_id)
            
            # Range Title
            range_title = f"{destination.name.upper()} &nbsp; {clean_km(rr.from_km)} - {clean_km(rr.to_km)}"
            range_title_cont = f"{range_title} (Contd.)"


            # elements.append(Paragraph(range_title, styles['CenterBold']))
            # elements.append(Spacer(1, 3))

            dealer_entries = DealerEntry.objects.filter(range_entry=range_entry)

            table_data = [[
                "SL NO", "Date", "MDA NO", "Description", "Despatched to",
                "Bag", "MT", "KM", "MTK", "Rate", "Amount", "Remarks"
            ]]

            for i, d in enumerate(dealer_entries, start=1):
                table_data.append([
                    str(i),
                    str(d.date),
                    d.mda_number,
                    trim(d.description),
                    trim(d.despatched_to),
                    d.no_bags,
                    f"{d.mt:.3f}",
                    d.km,
                    f"{d.mtk:.2f}",
                    f"{range_entry.rate:.2f}",
                    f"{d.amount:.2f}",
                    Paragraph(d.remarks or "", styles['CustomNormal'])
                ])

            # Total Row
            table_data.append([
                "", "", "", "", "TOTAL",
                range_entry.total_bags,
                f"{range_entry.total_mt:.3f}",
                "",
                f"{range_entry.total_mtk:.2f}",
                f"{range_entry.rate:.2f}",
                f"{range_entry.total_amount:.2f}",
                ""
            ])

            

            col_widths = [30, 45, 55, 70, 180, 35, 40, 40, 45, 40, 50, 40]
            scale = (usable_width * 0.98) / sum(col_widths)
            col_widths = [w * scale for w in col_widths]

            table = Table(table_data, colWidths=col_widths, repeatRows=1)
            table.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.7, colors.black),               
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('FONT', (0,0), (-1,0), 'Helvetica-Bold'),               
                ('FONT', (0,-1), (-1,-1), 'Helvetica-Bold'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 3),
                ('RIGHTPADDING', (0,0), (-1,-1), 3),
            ]))

            block = BreakableRangeBlock(
                title=range_title,
                title_cont=range_title_cont,
                table=table,
                style=styles['CenterBold']
            )

            elements.append(block)
            elements.append(Spacer(1, 12))


        elements.append(Spacer(1, 20))

        # HEADER & FOOTER DRAW
        def draw_header_footer(canvas, doc):
            canvas.saveState()

            header_table = Table(
                [[left_column, "", right_column]],
                colWidths=[480, 40, 300]
            )
            hw, hh = header_table.wrap(doc.width, doc.topMargin)
            header_table.drawOn(canvas, doc.leftMargin, doc.height + doc.topMargin - hh + 40)

            footer_data = [[
                Paragraph("Passed by", styles['CustomNormal']),
                "",
                Paragraph("Officer in charge", styles['CustomNormal']),
                "",
                Paragraph("Signature of contractor", styles['CustomNormal'])
            ]]

            footer_table = Table(footer_data, colWidths=[140, 120, 140, 120, 140])
            fw, fh = footer_table.wrap(doc.width, doc.bottomMargin)
            footer_table.drawOn(canvas, doc.leftMargin, 15 * mm)

            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)

        buffer.seek(0)
        return buffer

    
    @action(detail=False, methods=["get"], url_path="transport-depot-unbilled")
    def transport_depot_unbilled(self, request):
        """
        Dealer entries:
        - DestinationEntry is TRANSPORT_DEPOT
        OR destination is garage
        - service_bill IS NULL
        OR equals provided service_bill_id (edit mode)
        """

        service_bill_id = request.query_params.get("service_bill_id")

        qs = (
            DealerEntry.objects
            .filter(
                Q(range_entry__destination_entry__transport_type="TRANSPORT_DEPOT") |
                Q(range_entry__destination_entry__destination__is_garage=True)
            )
            .filter(
                Q(service_bill__isnull=True) |
                Q(service_bill_id=service_bill_id)
            )
            .select_related(
                "dealer",
                "range_entry",
                "range_entry__destination_entry",
                "range_entry__destination_entry__destination",
            )
        )

        serializer = TransportDepotDealerEntrySerializer(qs, many=True)
        return Response({"results": serializer.data})
    
    @action(detail=False, methods=["get"], url_path="transport-fol-unbilled")
    def transport_fol_unbilled(self, request):
        
        service_bill_id = request.query_params.get("service_bill_id")
        qs = self.queryset.filter(
                Q(transport_type="TRANSPORT_FOL") |
                Q(destination__is_garage=False) | 
                Q(destination__is_garage__isnull=True)
            ).filter(
                Q(service_bill__isnull=True) |
                Q(service_bill_id=service_bill_id)
            )

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["post"], url_path="transport-fol-preview")
    def transport_fol_preview(self, request):
        """
        Build Transport FOL preview table
        GROUPING:
            Range Slab
              └── Destination
        """

        destination_entry_ids = request.data.get("destination_entry_ids", [])
        rh_qty = float(request.data.get("rh_qty", 0) or 0)

        if not destination_entry_ids:
            return Response(
                {"detail": "destination_entry_ids is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ------------------------------------------------------------
        # Fetch only TRANSPORT_FOL slab range entries
        # ------------------------------------------------------------
        range_entries = (
            RangeEntry.objects
            .select_related(
                "destination_entry__destination",
                "rate_range"
            )
            .filter(
                Q(destination_entry_id__in=destination_entry_ids) &
                Q(Q(destination_entry__transport_type="TRANSPORT_FOL") |
                Q(destination_entry__destination__is_garage=False) ) &
                Q(rate_range__isnull=False)
            )
        )

        if not range_entries.exists():
            return Response(
                {"detail": "No Transport FOL slab entries found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ------------------------------------------------------------
        # Group: Slab → Destination
        # ------------------------------------------------------------
        grouped = defaultdict(lambda: defaultdict(list))

        for entry in range_entries:
            slab = entry.rate_range
            destination = entry.destination_entry.destination
            grouped[slab][destination].append(entry)

        slabs = []
        grand_total_qty = 0
        grand_total_amount = 0

        # ------------------------------------------------------------
        # Build slab-wise response
        # ------------------------------------------------------------
        for slab, destinations in grouped.items():
            slab_qty = 0
            slab_mtk = 0
            slab_amount = 0

            destination_rows = []

            for destination, entries in destinations.items():
                dest_qty = sum(e.total_mt or 0 for e in entries)
                dest_mtk = sum(e.total_mtk or 0 for e in entries)
                dest_amount = sum(e.total_amount or 0 for e in entries)

                slab_qty += dest_qty
                slab_mtk += dest_mtk
                slab_amount += dest_amount

                destination_rows.append({
                    "destination_entry_id": entries[0].destination_entry_id,
                    "destination_place": destination.place,
                    "qty_mt": round(dest_qty, 2),
                    "qty_mtk": round(dest_mtk, 2),
                    "amount": round(dest_amount, 2),
                })

            slabs.append({
                "range_slab": f"{fmt_km(slab.from_km)} - {fmt_km(slab.to_km)}",
                "rate": slab.rate,
                "destinations": destination_rows,
                "range_total_qty": round(slab_qty, 2),
                "range_total_mtk": round(slab_mtk, 2),
                "range_total_amount": round(slab_amount, 2),
            })

            grand_total_qty += slab_qty
            grand_total_amount += slab_amount

        # ------------------------------------------------------------
        # Final response
        # ------------------------------------------------------------
        response = {
            "slabs": slabs,
            "rh_qty": round(rh_qty, 2),
            "grand_total_qty": round(grand_total_qty + rh_qty, 2),
            "grand_total_amount": round(grand_total_amount, 2),
        }

        return Response(response, status=status.HTTP_200_OK)
    
    

class ServiceBillViewSet(BaseViewSet):
    queryset = ServiceBill.objects.all()
    serializer_class = ServiceBillCreateSerializer
    search_fields = [
        "id",
        "bill_date",
        "handling__bill_number",
        "transport_depot__bill_number",
        "transport_fol__bill_number",
    ]

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()
        
    @action(
        detail=False,
        methods=["delete"],
        url_path="bulk-delete"
    )
    @transaction.atomic
    def bulk_delete(self, request):
        ids = request.query_params.get("ids")

        if not ids:
            return Response(
                {"detail": "No IDs provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        id_list = [int(i) for i in ids.split(",") if i.isdigit()]

        if not id_list:
            return Response(
                {"detail": "Invalid ID list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = ServiceBill.objects.filter(id__in=id_list)
        deleted_count = qs.count()
        qs.delete()

        return Response(
            {"deleted": deleted_count},
            status=status.HTTP_200_OK
        )