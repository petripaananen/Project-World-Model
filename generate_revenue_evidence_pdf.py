"""
Generates a strict 1-Page Official Pre-Revenue Financial Evidence & Certification PDF
for the Build with Gemini XPRIZE Hackathon submission.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "Docs")
OUTPUT_PDF = os.path.join(DOCS_DIR, "PWM_Revenue_Evidence_PreRevenue_Certification.pdf")

def build_pdf():
    # Letter is 612 x 792 points. With 30pt margins, printable height is 732pt.
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=30,
        rightMargin=30,
        topMargin=25,
        bottomMargin=25
    )

    styles = getSampleStyleSheet()

    primary_color = colors.HexColor("#0f172a") # dark slate
    accent_color = colors.HexColor("#0284c7")  # blue accent
    text_color = colors.HexColor("#1e293b")    # slate text
    light_bg = colors.HexColor("#f1f5f9")      # very light slate

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=primary_color,
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=accent_color,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=primary_color,
        spaceBefore=6,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=text_color,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=text_color,
        alignment=1
    )

    table_cell_left = ParagraphStyle(
        'TableCellLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=text_color,
        alignment=0
    )

    story = []

    # Header
    story.append(Paragraph("PROJECT WORLD MODEL (PWM)", title_style))
    story.append(Paragraph("<b>Build with Gemini XPRIZE Hackathon</b> — Small Business Services Track | <b>Pre-Revenue Financial Evidence & Certification</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.2, color=accent_color, spaceAfter=6))

    # Section 1
    story.append(Paragraph("1. Executive Summary & Pre-Revenue Operational Status Attestation", h2_style))
    story.append(Paragraph(
        "This official disclosure certifies that <b>Project World Model (PWM)</b> is an early-stage software engineering platform that operated in a <b>pre-launch / closed-beta research and development state</b> throughout the Build with Gemini XPRIZE Hackathon reporting period (May 1, 2026 – August 31, 2026). "
        "In compliance with hackathon rules permitting pre-revenue projects: <b>Gross Revenue is $0.00 USD</b>, with <b>0 paying users</b> and <b>$0.00 in related-party or affiliate transactions</b>.",
        body_style
    ))

    # Section 2
    story.append(Paragraph("2. Monthly Revenue & Expense Breakdown (May 2026 – August 2026)", h2_style))
    
    table_data = [
        [
            Paragraph("Category", table_header_style),
            Paragraph("May 2026", table_header_style),
            Paragraph("June 2026", table_header_style),
            Paragraph("July 2026", table_header_style),
            Paragraph("August 2026", table_header_style),
            Paragraph("Total (USD)", table_header_style)
        ],
        [
            Paragraph("Third-Party Customer Revenue", table_cell_left),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style)
        ],
        [
            Paragraph("Related-Party / Affiliate Revenue", table_cell_left),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Gross Revenue</b>", table_cell_left),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style)
        ],
        [
            Paragraph("Infrastructure & API Costs (COGS)", table_cell_left),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("€34.92 (~$38.00)", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("<b>€34.92 (~$38.00)</b>", table_cell_style)
        ],
        [
            Paragraph("Marketing & Customer Acquisition", table_cell_left),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("$0.00", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Net Operating Income (Loss)</b>", table_cell_left),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>-€34.92</b>", table_cell_style),
            Paragraph("<b>$0.00</b>", table_cell_style),
            Paragraph("<b>-€34.92 (~$38.00)</b>", table_cell_style)
        ]
    ]

    t = Table(table_data, colWidths=[185, 70, 70, 95, 70, 62])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t)

    # Section 3
    story.append(Paragraph("3. Operational Cost & Infrastructure Evidence (COGS)", h2_style))
    story.append(Paragraph(
        "All development and simulation activities were hosted on <b>Google Cloud Platform (GCP)</b>. During July 2026 testing, total operational costs were governed at <b>€34.92 (~$38.00 USD)</b> through our <b>Compute-to-Rework Ratio (CRR)</b> engine and Cloud Run scale-to-zero autoscaling:"
        "<br/>• <b>Google Vertex AI & Gemini API:</b> €33.01 ($36.00 USD) for 4.5M+ tokens across Gemini 3.6 Flash, Gemini 3.1 Pro, and Gemini 3.5 Flash."
        "<br/>• <b>Container Registry & Cloud Storage:</b> €1.83 ($2.00 USD) for Artifact Registry container image storage."
        "<br/>• <b>Google Cloud Run Compute:</b> Incurred €0.08, fully offset by standard GCP Free Tier credits (€0.00 net).",
        body_style
    ))

    # Section 4
    story.append(Paragraph("4. Commercialization Roadmap & Tiered SaaS Pricing", h2_style))
    story.append(Paragraph(
        "Commercial monetization activates with V1.0 targeting small engineering teams via 4 subscription tiers: "
        "<b>Free Hobby</b> ($0/mo, 1M simulation tokens), <b>Starter</b> ($9.99/mo, 5M tokens), <b>Pro</b> ($49.99/mo, 25M tokens), and <b>Enterprise</b> ($99.99/mo, 100M tokens). "
        "A transparent <i>Three-Gate</i> overage model protects small businesses from unexpected token billing surprises.",
        body_style
    ))

    # Section 5: Signature & Verification Table
    story.append(Paragraph("5. Formal Founder Certification & Attestation", h2_style))
    story.append(Paragraph(
        "<i>I hereby certify under penalty of perjury that the financial statements, revenue disclosures, and cost figures presented in this document and the accompanying P&L file (<code>PWM_Profit_and_Loss_Statement.csv</code>) are true, correct, and complete representations of Project World Model's financial activity for the Build with Gemini XPRIZE Hackathon.</i>",
        body_style
    ))
    story.append(Spacer(1, 2))
    
    sig_table = Table([
        [
            Paragraph("<b>Founder & Lead Developer:</b> Petri Paananen<br/><b>Project:</b> Project World Model (PWM)<br/><b>Submission Date:</b> August 16, 2026", body_style),
            Paragraph("<b>Live Cloud Run URL:</b><br/><font color='#0284c7'>https://project-world-model-106911803120.us-central1.run.app</font><br/><b>GitHub:</b> <font color='#0284c7'>https://github.com/petripaananen/Project-World-Model</font>", body_style)
        ]
    ], colWidths=[270, 282], style=[
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('PADDING', (0,0), (-1,-1), 6)
    ])
    story.append(sig_table)

    doc.build(story)
    print(f"[SUCCESS] 1-Page Revenue Evidence PDF created: {OUTPUT_PDF}")
    print(f"File size: {os.path.getsize(OUTPUT_PDF) / 1024:.2f} KB")

if __name__ == "__main__":
    build_pdf()
