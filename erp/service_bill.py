from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle,
    Spacer, PageBreak
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib import colors
from num2words import num2words

from django.conf import settings

from erp.models import (
    ServiceBill,
    HandlingBillSection,
    TransportDepotSection,
    TransportFOLSection,
)
from io import BytesIO
from reportlab.platypus.flowables import HRFlowable
from erp.models import DealerEntry
from django.db.models import Q
from collections import defaultdict
from datetime import datetime


styles = getSampleStyleSheet()

HEADER = ParagraphStyle(
    "HEADER",
    fontSize=12,
    alignment=TA_CENTER,
    spaceAfter=6,
    leading=12,
)

RIGHT = ParagraphStyle(
    "RIGHT",
    fontSize=11,
    alignment=TA_RIGHT,
)

NORMAL = ParagraphStyle(
    "NORMAL",
    fontSize=11,
    leading=12,
    linespacing=4,
)

BOLD = ParagraphStyle(
    "BOLD",
    fontSize=11,
    leading=12,
    fontName="Helvetica-Bold",
)


# --------------------------------------------------
# Common Header
# --------------------------------------------------
def build_company_header(story):
    story.append(Paragraph(
        "<b>M/S. SHAN ENTERPRISES</b><br/>"
        "GST32ACNFS8060K1ZP<br/>"
        "Clearing &amp; Transporting Contractor<br/>"
        "21/4185 C, Meenchanda Rly. Gate<br/>"
        "P.O. Arts College Calicut – 673018<br/>"
        "Mob: 9447004108",
        ParagraphStyle(
            "company",
            fontSize=12,
            leading=15,
        )
    ))
    story.append(Spacer(1, 5))

# --------------------------------------------------
# HANDLING SECTION
# --------------------------------------------------



def build_handling_section(story, bill: ServiceBill):
    handling = bill.handling

    # --------------------------------------------------
    # HEADER
    # --------------------------------------------------
    build_company_header(story)
    #  need two lines below header
    
    story.append(HRFlowable(
        width="100%",
        thickness=1,
        color=colors.black,
        spaceBefore=4,
        spaceAfter=2,
    ))

    story.append(HRFlowable(
        width="100%",
        thickness=1,
        color=colors.black,
        spaceBefore=2,
        spaceAfter=8,
    ))

    header_tbl = Table(
        [[
            Paragraph(f"<b>BILL NO :</b> {handling.bill_number}", NORMAL),
            Paragraph(f"<b>Date :</b> {bill.bill_date.strftime('%d-%m-%Y')} &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  ", RIGHT),
        ]],
        colWidths=[275, 260],
    )

    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # TO + REF
    # --------------------------------------------------
    story.append(Paragraph("<b>TO</b>", NORMAL))
    story.append(Paragraph(
        bill.to_address.replace("\n", "<br/>"),
        NORMAL
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        f"Ref :- {bill.letter_note}",
        NORMAL
    ))
    story.append(Spacer(1, 10))
    # --------------------------------------------------
    # QTY / FOL / DEPOT TABLE  + DATE OF CLEARING BOX
    # --------------------------------------------------
    def val(v):
        return f"{v:.2f}" if v not in (None, "", 0) else "NIL"

    qty_table = Table(
        [
            ["Qty. Shipped", "", val(handling.qty_shipped)],
            ["FOL", val(handling.fol_total), ""],
            ["ASC, SWC & CWC", val(handling.depot_total), ""],
            ["RH SALES", val(handling.rh_sales), ""],
            ["Qty. Received", "", val(handling.qty_received)],
            ["Excess / Shortage", "", val(handling.shortage) ],
        ],
        colWidths=[160, 90, 70],
    )

    qty_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    
    clearing_box = Table(
        [
            [Paragraph("<b>Date of Clearing</b>", NORMAL)],
            [Paragraph(datetime.strptime(bill.date_of_clearing, '%Y-%m-%d').strftime('%d-%m-%Y') or "", NORMAL)],
        ],
        colWidths=[130],
        rowHeights=[22, 22],
    )

    clearing_box.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    combo = Table(
        [[qty_table, clearing_box]],
        colWidths=[360, 140],
    )
    story.append(combo)
    story.append(Spacer(1, 10))
    # --------------------------------------------------
    # GST + PRODUCT BLOCK
    # --------------------------------------------------
    story.append(Paragraph(
        "<b>FACT GST 32AAACT6204C1Z2</b>",
        ParagraphStyle(
            "factgst",
            alignment=TA_CENTER,
            fontSize=9
        )
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"<b>PRODUCT : {bill.product}</b>",
        NORMAL
    ))
    story.append(Paragraph(
        "<b>WESTHILL RH</b>",
        NORMAL
    ))
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # TAX BILL TITLE
    # --------------------------------------------------
    story.append(Paragraph(
        "<b>TAX BILL OF HANDLING SERVICES</b>",
        HEADER
    ))
    hsn_tbl = Table(
        [[
            Paragraph(f"<b>HSN/SAC CODE : {bill.hsn_code}</b>", NORMAL),
            Paragraph(f"<b>YEAR : {bill.year}</b>", RIGHT),
        ]],
        colWidths=[260, 260],
    )

    story.append(hsn_tbl)
    story.append(Spacer(1, 6))

    # --------------------------------------------------
    # TAX TABLE
    # --------------------------------------------------
    tax_table = Table(
        [
            [
                "Particulars", "Products", "Qty",
                "Rate Per/MT\nRs.  Ps.",
                "Bill Amount",
                "CGST", "SGST", "Total"
            ],
            [
                handling.particulars or "Wagon",
                handling.products or bill.product,
                f"{handling.total_qty:.2f}",
                f"{handling.bill_amount / handling.total_qty:.2f}",
                f"{handling.bill_amount:.2f}",
                f"{handling.cgst:.2f}",
                f"{handling.sgst:.2f}",
                f"{handling.total_bill_amount:.2f}",
            ]
        ],
        colWidths=[75, 70, 50, 75, 70, 60, 60, 70],  # 👈 increased
        rowHeights=[30, 24],                        # 👈 taller rows
    )


    tax_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.8, colors.black),

        # Header
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),

        # Data row
        ("ALIGN", (2, 1), (-1, 1), "RIGHT"),
        ("VALIGN", (0, 1), (-1, 1), "MIDDLE"),

        # Padding (THIS makes it look bigger)
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))


    story.append(tax_table)
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # AMOUNT IN WORDS
    # --------------------------------------------------
    words = num2words(
        handling.total_bill_amount,
        lang="en_IN"
    ).replace("-", " ")

    story.append(Paragraph(
        f"We are claiming for Rs. {handling.total_bill_amount:.2f} "
        f"({words} only) For Clearing &amp; Transportation Bill of Fertilizer.",
        NORMAL
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Kindly arrange payment to M/S. Shan Enterprises, through IFSC NO.<br/>"
        "CNRB0014404 – A/C. No.44041400000041 "
        "Canara Bank, Panniyankara, Calicut.",
        NORMAL
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Acknowledge copies of Delivery advice attached with this bill<br/>"
        "I request you to approve this bill and payment may be made at an early date",
        NORMAL
    ))
    story.append(Spacer(1, 14))
    
    footer_tbl = Table(
        [[
            Paragraph("Thanking you", NORMAL),
            Paragraph("Yours faithfully &nbsp; &nbsp; &nbsp;", RIGHT),
        ]],
        colWidths=[286, 260],
    )
    story.append(footer_tbl)


    story.append(PageBreak())


# --------------------------------------------------
# DEPOT SECTION
# --------------------------------------------------

def build_depot_section(story, bill: ServiceBill):
    depot = bill.transport_depot

    dealer_entries = bill.dealer_entries.filter(Q(range_entry__destination_entry__transport_type="TRANSPORT_DEPOT") |
                Q(range_entry__destination_entry__destination__is_garage=True))

    # --------------------------------------------------
    # HEADER (same as handling)
    # --------------------------------------------------
    build_company_header(story)

    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 2))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # BILL NO + DATE
    # --------------------------------------------------
    header_tbl = Table(
        [[
            Paragraph(f"<b>BILL NO :</b> {depot.bill_number}", NORMAL),
            Paragraph(f"<b>Date :</b> {bill.bill_date.strftime('%d-%m-%Y')}", RIGHT),
        ]],
        colWidths=[275, 260],
    )
    story.append(header_tbl)
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # TO + REF (LEFT) | DATE OF CLEARING (RIGHT)
    # --------------------------------------------------
    left_block = [
        Paragraph("<b>TO</b>", NORMAL),
        Paragraph(bill.to_address.replace("\n", "<br/>"), NORMAL),
        Spacer(1, 6),
        Paragraph(f"Ref :- {bill.letter_note}", NORMAL),
    ]

    left_tbl = Table([[left_block]], colWidths=[360])

    clearing_box = Table(
        [
            [Paragraph("<b>Date of Clearing</b>", NORMAL)],
            [Paragraph(datetime.strptime(bill.date_of_clearing, '%Y-%m-%d').strftime('%d-%m-%Y') or "", NORMAL)],
        ],
        colWidths=[140],
        rowHeights=[22, 22],
    )

    clearing_box.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    combo = Table(
        [[left_tbl, clearing_box]],
        colWidths=[360, 140],
    )
    story.append(combo)
    story.append(Spacer(1, 10))

    # --------------------------------------------------
    # GST + PRODUCT
    # --------------------------------------------------
    story.append(Paragraph(
        "<b>FACT GST 32AAACT6204C1Z2</b>",
        ParagraphStyle("factgst", alignment=TA_CENTER, fontSize=9)
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph(f"<b>PRODUCT : {bill.product}</b>", NORMAL))
    story.append(Paragraph("<b>WESTHILL RH</b>", NORMAL))
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # SECTION TITLE
    # --------------------------------------------------
    story.append(Paragraph("<b>TRANSPORTATION (DEPOT)</b>", HEADER))

    hsn_tbl = Table(
        [[
            Paragraph(f"<b>HSN/SAC CODE : {bill.hsn_code}</b>", NORMAL),
            Paragraph(f"<b>YEAR : {bill.year}</b>", RIGHT),
        ]],
        colWidths=[260, 260],
    )
    story.append(hsn_tbl)
    story.append(Spacer(1, 6))

    # --------------------------------------------------
    # DEPOT TABLE (Dealer Entries)
    # --------------------------------------------------
    def P(text):
        return Paragraph(text, BOLD)

    table_data = [[
        "Sl.\nNo.",
        "Destinations",
        "Qty\nMT",
        "KM",
        "Qty\nMT × KM",
        "Rate\nRs. Ps.",
        "Amount\nRs. Ps.",
    ]]

    total_qty = 0
    total_amount = 0

    for i, e in enumerate(dealer_entries, 1):
        # remove .0 from from_km and to_km if integer
        from_km = int(e.range_entry.rate_range.from_km)
        to_km = int(e.range_entry.rate_range.to_km)
        slab = f"SLAB {from_km}-{to_km}"
        table_data.append([
            i,
            e.range_entry.destination_entry.destination.name,
            f"{e.mt:.3f}",
            f"{slab}",
            f"{e.mtk:.3f}",
            f"{e.rate:.2f}",
            f"{e.amount:.2f}",
        ])
        total_qty += e.mt
        total_amount += e.amount

    table_data.append([
        P("TOTAL"),      # col 0
        "",              # col 1 (spanned)
        P(f"{total_qty:.2f}"),
        "", "", "",
        P(f"{total_amount:.2f}"),
    ])

    table = Table(
        table_data,
        repeatRows=1,
        colWidths=[35, 130, 60, 70, 75, 65, 75],
    )

    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),

        # Header
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),

        # Data alignment
        ("ALIGN", (2, 1), (-1, -2), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

        # TOTAL row
        ("SPAN", (0, -1), (1, -1)),        # TOTAL spans Sl + Destination
        ("ALIGN", (2, -1), (2, -1), "RIGHT"),
        ("ALIGN", (-1, -1), (-1, -1), "RIGHT"),

        # Padding
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))

    story.append(table)
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # CLAIM BLOCK (same wording style as handling)
    # --------------------------------------------------
    words = num2words(
        round(total_amount, 2),
        lang="en_IN"
    ).replace("-", " ").replace(",", "")

    story.append(Paragraph(
        f"We are claiming for Rs. {total_amount:.2f} "
        f"({words} only) For Clearing &amp; Transportation Bill of Fertilizer.",
        NORMAL
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "Kindly arrange payment to M/S. Shan Enterprises, through IFSC NO.<br/>"
        "CNRB0014404 – A/C. No.44041400000041 "
        "Canara Bank, Panniyankara, Calicut.",
        NORMAL
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Acknowledge copies of Delivery advice attached with this bill<br/>"
        "I request you to approve this bill and payment may be made at an early date",
        NORMAL
    ))
    story.append(Spacer(1, 14))

    footer_tbl = Table(
        [[
            Paragraph("Thanking you", NORMAL),
            Paragraph("Yours faithfully", RIGHT),
        ]],
        colWidths=[286, 260],
    )
    story.append(footer_tbl)

    story.append(PageBreak())

# --------------------------------------------------
# FOL SECTION (SLAB-WISE)
# --------------------------------------------------


def build_fol_section(story, bill: ServiceBill):
    fol = bill.transport_fol
    
    rh_qty = fol.rh_qty or 0

    # --------------------------------------------------
    # HEADER (same as depot)
    # --------------------------------------------------
    build_company_header(story)

    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 2))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 8))

    header_tbl = Table(
        [[
            Paragraph(f"<b>BILL NO :</b> {fol.bill_number}", NORMAL),
            Paragraph(f"<b>Date :</b> {bill.bill_date.strftime('%d-%m-%Y')}", RIGHT),
        ]],
        colWidths=[275, 260],
    )
    story.append(header_tbl)
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # TO + REF | DATE OF CLEARING
    # --------------------------------------------------
    left_block = [
        Paragraph("<b>TO</b>", NORMAL),
        Paragraph(bill.to_address.replace("\n", "<br/>"), NORMAL),
        Spacer(1, 6),
        Paragraph(f"Ref :- {bill.letter_note}", NORMAL),
    ]

    left_tbl = Table([[left_block]], colWidths=[360])

    clearing_box = Table(
        [
            [Paragraph("<b>Date of Clearing</b>", NORMAL)],
            [Paragraph(datetime.strptime(bill.date_of_clearing, '%Y-%m-%d').strftime('%d-%m-%Y') or "", NORMAL)],
        ],
        colWidths=[140],
        rowHeights=[22, 22],
    )
    clearing_box.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.7, colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    story.append(Table([[left_tbl, clearing_box]], colWidths=[360, 140]))
    story.append(Spacer(1, 10))

    # --------------------------------------------------
    # GST + PRODUCT
    # --------------------------------------------------
    story.append(Paragraph(
        "<b>FACT GST 32AAACT6204C1Z2</b>",
        ParagraphStyle("factgst", alignment=TA_CENTER, fontSize=9)
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>PRODUCT : {bill.product}</b>", NORMAL))
    story.append(Paragraph("<b>WESTHILL RH</b>", NORMAL))
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # SECTION TITLE
    # --------------------------------------------------
    story.append(Paragraph("<b>TRANSPORTATION (FOL)</b>", HEADER))

    hsn_tbl = Table(
        [[
            Paragraph(f"<b>HSN/SAC CODE : {bill.hsn_code}</b>", NORMAL),
            Paragraph(f"<b>YEAR : {bill.year}</b>", RIGHT),
        ]],
        colWidths=[260, 260],
    )
    story.append(hsn_tbl)
    story.append(Spacer(1, 6))

    # --------------------------------------------------
    # TABLE HEADER
    # --------------------------------------------------
    table_data = [[
        "Sl.\nNo.", "Destinations", "Qty", "Total Qty",
        "KM", "MT × KM", "Total MT × KM",
        "Rate", "Amount Rs.", "Total Amount"
    ]]

    table_styles = []
    row_index = 1
    sl_no = 1

    grand_qty = grand_mt = grand_mtk = grand_amount = 0

    # --------------------------------------------------
    # SLAB LOOP (EXACT TKINTER LOGIC)
    # --------------------------------------------------
    def slab_start_km(slab):
        """
        Extract starting KM from slab.range_slab like '50 - 75'
        """
        try:
            return int(slab.range_slab.split("-")[0].strip())
        except Exception:
            return 0
    
    slabs = sorted(
        fol.slabs.all(),
        key=slab_start_km
    )

    for slab in slabs:
        start_row = row_index

        slab_qty = slab_mt = slab_mtk = slab_amount = 0
        slab_label = f"SLAB \n {slab.range_slab}"

        # group destinations inside slab
        dest_grouped = defaultdict(lambda: {
            "qty": 0, "mt": 0, "mtk": 0, "amount": 0, "km": 0
        })

        for d in slab.destinations.all():
            dest_grouped[d.destination_place]["mt"] += d.qty_mt
            dest_grouped[d.destination_place]["mtk"] += d.qty_mtk
            dest_grouped[d.destination_place]["amount"] += d.amount
            dest_grouped[d.destination_place]["km"] = (
                d.qty_mtk / d.qty_mt if d.qty_mt else 0
            )

        # insert destination rows
        for dest, vals in dest_grouped.items():
            table_data.append([
                sl_no,
                dest,
                f"{vals['mt']:.2f}",
                "",                      # total qty (spanned)
                slab_label,
                f"{vals['mt'] * vals['km']:.2f}",
                "",                      # total mtk (spanned)
                f"{slab.rate:.2f}",
                f"{vals['amount']:.2f}",
                "",                      # total amount (spanned)
            ])

            slab_qty += vals["mt"]
            slab_mtk += vals["mtk"]
            slab_amount += vals["amount"]

            row_index += 1

        # fill slab totals on first row
        table_data[start_row][3] = f"{slab_qty:.2f}"
        table_data[start_row][6] = f"{slab_mtk:.2f}"
        table_data[start_row][9] = f"{slab_amount:.2f}"

        # span slab columns
        table_styles.extend([
            ("SPAN", (0, start_row), (0, row_index - 1)),  # Sl No
            ("SPAN", (3, start_row), (3, row_index - 1)),  # Total Qty
            ("SPAN", (4, start_row), (4, row_index - 1)),  # KM
            ("SPAN", (6, start_row), (6, row_index - 1)),  # Total MTK
            ("SPAN", (7, start_row), (7, row_index - 1)),  # Rate
            ("SPAN", (9, start_row), (9, row_index - 1)),  # Total Amount
        ])

        sl_no += 1
        grand_qty += slab_qty
        grand_mtk += slab_mtk
        grand_amount += slab_amount
        
    if rh_qty > 0:
        table_data.append([
            sl_no,                # Sl No
            "RH",               # Destination
            f"{rh_qty:.3f}",    # Qty
            f"{rh_qty:.3f}",    # Total Qty
            "", "", "", "", "", ""
        ])

        grand_qty += rh_qty

    # --------------------------------------------------
    # GRAND TOTAL ROW
    # --------------------------------------------------
    table_data.append([
        "", "TOTAL", "",
        f"{grand_qty:.2f}",
        "", "", f"{grand_mtk:.2f}",
        "", "", f"{grand_amount:.2f}",
    ])

    # --------------------------------------------------
    # BUILD TABLE
    # --------------------------------------------------
    page_width = A4[0]
    usable_width = page_width - 60  # left + right margin (30 + 30)
    
    # Reduce table width slightly (95%)
    target_width = usable_width * 0.95
    
    base_widths = [35, 90, 40, 55, 55, 55, 70, 40, 70, 75]
    scale = target_width / sum(base_widths)
    col_widths = [w * scale for w in base_widths]

    table = Table(
        table_data,
        colWidths=col_widths,
        repeatRows=1,
    )

    table.setStyle(TableStyle(table_styles + [
        ("GRID", (0, 0), (-1, -1), 0.25, colors.black),
        ("BOX", (0, 0), (-1, -1), 1, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("BACKGROUND", (0, -1), (-1, -1), colors.whitesmoke),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))

    story.append(table)
    story.append(Spacer(1, 12))

    # --------------------------------------------------
    # CLAIM BLOCK
    # --------------------------------------------------
    words = num2words(
        round(grand_amount, 2),
        lang="en_IN"
    ).replace("-", " ").replace(",", "")

    story.append(Paragraph(
        f"We are claiming for Rs. {grand_amount:.2f} "
        f"({words} only) For Clearing &amp; Transportation Bill of Fertilizer.",
        NORMAL
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Kindly arrange payment to M/S. Shan Enterprises, through IFSC NO.<br/>"
        "CNRB0014404 – A/C. No.44041400000041 "
        "Canara Bank, Panniyankara, Calicut.",
        NORMAL
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Acknowledge copies of Delivery advice attached with this bill<br/>"
        "I request you to approve this bill and payment may be made at an early date",
        NORMAL
    ))

    story.append(Spacer(1, 14))
    story.append(Table(
        [[Paragraph("Thanking you", NORMAL), Paragraph("Yours faithfully", RIGHT)]],
        colWidths=[286, 260],
    ))

    story.append(PageBreak())

# --------------------------------------------------
# MAIN EXPORT FUNCTION
# --------------------------------------------------

def generate_service_bill_pdf(service_bill_id):
    bill = ServiceBill.objects.select_related(
        "handling",
        "transport_depot",
        "transport_fol",
    ).prefetch_related(
        "transport_fol__slabs__destinations"
    ).get(id=service_bill_id)

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=40,
        bottomMargin=40,
    )

    elements = []

    # -------------------------------
    # SECTION 1 – HANDLING
    # -------------------------------
    if getattr(bill, "handling", None):
        build_handling_section(elements, bill)

    # -------------------------------
    # SECTION 2 – TRANSPORT DEPOT
    # -------------------------------
    if getattr(bill, "transport_depot", None):
        build_depot_section(elements, bill)

    # -------------------------------
    # SECTION 3 – TRANSPORT FOL
    # -------------------------------
    fol = getattr(bill, "transport_fol", None)
    if fol and fol.slabs.exists():
        build_fol_section(elements, bill)

    doc.build(elements)

    buffer.seek(0)
    return buffer