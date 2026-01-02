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
            Paragraph(f"<b>Date :</b> {bill.bill_date} &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;  ", RIGHT),
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
            [Paragraph(bill.date_of_clearing or "", NORMAL)],
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
        f"<b>PRODUCT :</b> {bill.product}",
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
            Paragraph(f"<b>HSN/SAC CODE :</b> {bill.hsn_code or '9967'}", NORMAL),
            Paragraph(f"<b>YEAR :</b> {bill.year}", RIGHT),
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
            Paragraph(f"<b>Date :</b> {bill.bill_date}", RIGHT),
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
            [Paragraph(bill.date_of_clearing or "", NORMAL)],
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

    story.append(Paragraph("<b>PRODUCT : FACTOMFOS</b>", NORMAL))
    story.append(Paragraph("<b>WESTHILL RH</b>", NORMAL))
    story.append(Spacer(1, 8))

    # --------------------------------------------------
    # SECTION TITLE
    # --------------------------------------------------
    story.append(Paragraph("<b>TRANSPORTATION (DEPOT)</b>", HEADER))

    hsn_tbl = Table(
        [[
            Paragraph("<b>HSN/SAC CODE : 9965</b>", NORMAL),
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

    build_company_header(story)

    story.append(Paragraph(
        f"<b>BILL NO:</b> {fol.bill_number} &nbsp;&nbsp;&nbsp;"
        f"<b>Date:</b> {bill.bill_date}",
        NORMAL
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>TRANSPORTATION</b>", HEADER))
    story.append(Paragraph(
        f"HSN/SAC CODE : 9965 &nbsp;&nbsp; YEAR : {bill.year}",
        NORMAL
    ))

    for slab in fol.slabs.all():
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>SLAB {slab.range_slab}</b>", BOLD))

        data = [["Destination", "Qty (MT)", "MT×KM", "Amount"]]

        for d in slab.destinations.all():
            data.append([
                d.destination_place,
                d.qty_mt,
                d.qty_mtk,
                d.amount,
            ])

        data.append([
            "Subtotal",
            slab.range_total_qty,
            slab.range_total_mtk,
            slab.range_total_amount,
        ])

        table = Table(data, repeatRows=1, colWidths=[120, 70, 80, 80])
        table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ]))

        story.append(table)

    story.append(Spacer(1, 10))
    words = num2words(fol.grand_total_amount, to="currency", lang="en_IN")
    story.append(Paragraph(
        f"We are claiming for Rs. {fol.grand_total_amount:.2f} ({words}) only.",
        NORMAL
    ))


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

    # SECTION 1
    build_handling_section(elements, bill)

    # SECTION 2
    build_depot_section(elements, bill)

    # SECTION 3
    build_fol_section(elements, bill)

    doc.build(elements)

    buffer.seek(0)
    return buffer