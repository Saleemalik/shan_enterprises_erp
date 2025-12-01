from .models import Dealer, Place, Destination, RateRange, DestinationEntry
from .serializers import DealerSerializer, PlaceSerializer, DestinationSerializer, RateRangeSerializer, DestinationEntrySerializer, DestinationEntryWriteSerializer
from .base import AppBaseViewSet
import pandas as pd
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from django.db.models import Q, F, Prefetch



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
    

class DestinationEntryViewSet(ModelViewSet):
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
        return Response(DestinationEntrySerializer(dest_entry).data)
    