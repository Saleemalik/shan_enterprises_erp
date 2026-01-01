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

styles = getSampleStyleSheet()

HEADER = ParagraphStyle(
    "HEADER",
    fontSize=10,
    alignment=TA_CENTER,
    spaceAfter=6,
    leading=12,
)

RIGHT = ParagraphStyle(
    "RIGHT",
    fontSize=9,
    alignment=TA_RIGHT,
)

NORMAL = ParagraphStyle(
    "NORMAL",
    fontSize=9,
    leading=12,
)

BOLD = ParagraphStyle(
    "BOLD",
    fontSize=9,
    leading=12,
    fontName="Helvetica-Bold",
)


# --------------------------------------------------
# Common Header
# --------------------------------------------------
def build_company_header(story):
    story.append(Paragraph("<b>M/S. SHAN ENTERPRISES</b>", HEADER))
    story.append(Paragraph(
        "GST32ACNFS8060K1ZP<br/>"
        "Clearing & Transporting Contractor<br/>"
        "21/4185 C, Meenchanda Rly. Gate<br/>"
        "P.O. Arts College Calicut – 673018<br/>"
        "Mob: 9447004108",
        styles["Normal"]
    ))
    story.append(Spacer(1, 8))


# --------------------------------------------------
# HANDLING SECTION
# --------------------------------------------------
def build_handling_section(story, bill: ServiceBill):
    handling = bill.handling

    build_company_header(story)

    story.append(Paragraph(
        f"<b>BILL NO:</b> {handling.bill_number} &nbsp;&nbsp;&nbsp;"
        f"<b>Date:</b> {bill.bill_date}",
        NORMAL
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>TO</b><br/>" + bill.to_address.replace("\n", "<br/>"), NORMAL))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Ref:- {bill.letter_note}", NORMAL))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>TAX BILL OF HANDLING SERVICES</b>", HEADER))
    story.append(Paragraph(
        f"HSN/SAC CODE : 9967 &nbsp;&nbsp; YEAR : {bill.year}",
        NORMAL
    ))

    data = [
        ["Particulars", "Qty", "Rate", "Bill Amount", "CGST", "SGST", "Total"],
        [
            handling.particulars or "",
            handling.total_qty,
            "",
            handling.bill_amount,
            handling.cgst,
            handling.sgst,
            handling.total_bill_amount,
        ]
    ]

    table = Table(data, colWidths=[80, 50, 50, 70, 60, 60, 70])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))

    story.append(table)
    story.append(Spacer(1, 10))

    words = num2words(handling.total_bill_amount, to="currency", lang="en_IN")
    story.append(Paragraph(
        f"We are claiming for Rs. {handling.total_bill_amount:.2f} "
        f"({words}) only.",
        NORMAL
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Date of Clearing : {bill.date_of_clearing}",
        NORMAL
    ))

    story.append(PageBreak())


# --------------------------------------------------
# DEPOT SECTION
# --------------------------------------------------
def build_depot_section(story, bill: ServiceBill):
    depot = bill.transport_depot
    entries = bill.destination_entries.filter(transport_type="TRANSPORT_DEPOT")

    build_company_header(story)

    story.append(Paragraph(
        f"<b>BILL NO:</b> {depot.bill_number} &nbsp;&nbsp;&nbsp;"
        f"<b>Date:</b> {bill.bill_date}",
        NORMAL
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>TRANSPORTATION (DEPOT)</b>", HEADER))
    story.append(Paragraph(
        f"HSN/SAC CODE : 9965 &nbsp;&nbsp; YEAR : {bill.year}",
        NORMAL
    ))

    table_data = [
        ["Sl", "Destination", "Qty (MT)", "KM", "MT×KM", "Rate", "Amount"]
    ]

    for i, e in enumerate(entries, 1):
        table_data.append([
            i,
            e.destination.place,
            e.total_mt,
            e.km,
            e.total_mtk,
            e.rate,
            e.total_amount,
        ])

    table_data.append([
        "",
        "TOTAL",
        depot.total_depot_qty,
        "",
        "",
        "",
        depot.total_depot_amount,
    ])

    table = Table(table_data, repeatRows=1, colWidths=[30, 100, 60, 50, 70, 50, 70])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))

    story.append(table)
    story.append(Spacer(1, 10))

    words = num2words(depot.total_depot_amount, to="currency", lang="en_IN")
    story.append(Paragraph(
        f"We are claiming for Rs. {depot.total_depot_amount:.2f} ({words}) only.",
        NORMAL
    ))

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
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.pagesizes import A4


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
