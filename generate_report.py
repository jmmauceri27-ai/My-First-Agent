"""
Generate a PDF research report on AI in Facility Maintenance.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import ListFlowable, ListItem
from datetime import date

# ── Colors ─────────────────────────────────────────────────────────────────────
DARK_GREEN   = colors.HexColor("#1A3C1F")
MID_GREEN    = colors.HexColor("#2E6B35")
LIGHT_GREEN  = colors.HexColor("#4CAF50")
PALE_GREEN   = colors.HexColor("#E8F5E9")
ACCENT_GOLD  = colors.HexColor("#F9A825")
DARK_GREY    = colors.HexColor("#263238")
MID_GREY     = colors.HexColor("#546E7A")
LIGHT_GREY   = colors.HexColor("#ECEFF1")
WHITE        = colors.white
TABLE_HEADER = colors.HexColor("#1A3C1F")
TABLE_ALT    = colors.HexColor("#F1F8E9")
TABLE_BORDER = colors.HexColor("#A5D6A7")

OUTPUT_PATH = "/home/user/My-First-Agent/AI_in_Facility_Maintenance_Report.pdf"


def build_styles():
    base = getSampleStyleSheet()

    styles = {
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Normal"],
            fontSize=32, leading=40, textColor=WHITE,
            fontName="Helvetica-Bold", alignment=TA_CENTER,
            spaceAfter=12
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle", parent=base["Normal"],
            fontSize=16, leading=22, textColor=colors.HexColor("#B9F6CA"),
            fontName="Helvetica", alignment=TA_CENTER
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta", parent=base["Normal"],
            fontSize=11, leading=16, textColor=colors.HexColor("#CFD8DC"),
            fontName="Helvetica", alignment=TA_CENTER
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Normal"],
            fontSize=20, leading=26, textColor=DARK_GREEN,
            fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=8,
            borderPad=(0, 0, 4, 0)
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Normal"],
            fontSize=14, leading=20, textColor=MID_GREEN,
            fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Normal"],
            fontSize=11, leading=16, textColor=DARK_GREY,
            fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontSize=10, leading=15, textColor=DARK_GREY,
            fontName="Helvetica", spaceAfter=6, alignment=TA_JUSTIFY
        ),
        "body_sm": ParagraphStyle(
            "body_sm", parent=base["Normal"],
            fontSize=9, leading=13, textColor=DARK_GREY,
            fontName="Helvetica", spaceAfter=4, alignment=TA_JUSTIFY
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["Normal"],
            fontSize=10, leading=15, textColor=DARK_GREY,
            fontName="Helvetica", spaceAfter=3,
            leftIndent=16, bulletIndent=4
        ),
        "bullet_sm": ParagraphStyle(
            "bullet_sm", parent=base["Normal"],
            fontSize=9, leading=13, textColor=MID_GREY,
            fontName="Helvetica", spaceAfter=2,
            leftIndent=28, bulletIndent=16
        ),
        "callout": ParagraphStyle(
            "callout", parent=base["Normal"],
            fontSize=10, leading=15, textColor=DARK_GREEN,
            fontName="Helvetica-BoldOblique", spaceAfter=6,
            leftIndent=12, rightIndent=12, alignment=TA_JUSTIFY
        ),
        "stat_big": ParagraphStyle(
            "stat_big", parent=base["Normal"],
            fontSize=28, leading=32, textColor=LIGHT_GREEN,
            fontName="Helvetica-Bold", alignment=TA_CENTER
        ),
        "stat_label": ParagraphStyle(
            "stat_label", parent=base["Normal"],
            fontSize=9, leading=12, textColor=MID_GREY,
            fontName="Helvetica", alignment=TA_CENTER
        ),
        "tag": ParagraphStyle(
            "tag", parent=base["Normal"],
            fontSize=8, leading=11, textColor=WHITE,
            fontName="Helvetica-Bold", alignment=TA_CENTER
        ),
        "toc_entry": ParagraphStyle(
            "toc_entry", parent=base["Normal"],
            fontSize=10, leading=18, textColor=DARK_GREEN,
            fontName="Helvetica", leftIndent=0
        ),
        "toc_sub": ParagraphStyle(
            "toc_sub", parent=base["Normal"],
            fontSize=9, leading=16, textColor=MID_GREY,
            fontName="Helvetica", leftIndent=20
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"],
            fontSize=8, leading=10, textColor=MID_GREY,
            fontName="Helvetica", alignment=TA_CENTER
        ),
        "source": ParagraphStyle(
            "source", parent=base["Normal"],
            fontSize=7.5, leading=11, textColor=MID_GREY,
            fontName="Helvetica", spaceAfter=2
        ),
        "section_label": ParagraphStyle(
            "section_label", parent=base["Normal"],
            fontSize=8, leading=10, textColor=LIGHT_GREEN,
            fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=2,
            letterSpacing=1
        ),
    }
    return styles


def hr(color=TABLE_BORDER, thickness=0.5, spaceB=4, spaceA=4):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=spaceA, spaceBefore=spaceB)


def section_header(text, styles, level=1):
    items = []
    if level == 1:
        items.append(hr(DARK_GREEN, 1.5, 14, 4))
        items.append(Paragraph(text, styles["h1"]))
        items.append(hr(LIGHT_GREEN, 0.5, 2, 8))
    elif level == 2:
        items.append(Paragraph(text, styles["h2"]))
        items.append(hr(TABLE_BORDER, 0.5, 2, 6))
    else:
        items.append(Paragraph(text, styles["h3"]))
    return items


def make_table(headers, rows, col_widths, styles_dict):
    s = styles_dict
    header_cells = [Paragraph(h, ParagraphStyle(
        "th", parent=s["body_sm"], textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_LEFT
    )) for h in headers]

    table_data = [header_cells]
    for i, row in enumerate(rows):
        styled_row = []
        for cell in row:
            p = Paragraph(str(cell), s["body_sm"])
            styled_row.append(p)
        table_data.append(styled_row)

    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
    row_bg = []
    for i in range(1, len(rows) + 1):
        bg = TABLE_ALT if i % 2 == 0 else WHITE
        row_bg.append(("BACKGROUND", (0, i), (-1, i), bg))

    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("GRID", (0, 0), (-1, -1), 0.4, TABLE_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ALT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ] + row_bg))
    return tbl


def highlight_box(text, styles_dict, bg=PALE_GREEN, border=MID_GREEN):
    p = Paragraph(text, styles_dict["callout"])
    tbl = Table([[p]], colWidths=[6.5 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 1, border),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return tbl


def stat_card(stat, label, styles_dict):
    sp = Paragraph(stat, styles_dict["stat_big"])
    lp = Paragraph(label, styles_dict["stat_label"])
    tbl = Table([[sp], [lp]], colWidths=[1.5 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_GREEN),
        ("BOX", (0, 0), (-1, -1), 1, LIGHT_GREEN),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    return tbl


def stat_row(stats, styles_dict):
    cards = [stat_card(s, l, styles_dict) for s, l in stats]
    tbl = Table([cards], colWidths=[1.5 * inch] * len(cards),
                hAlign="CENTER")
    tbl.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    return tbl


def on_page(canvas, doc):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(DARK_GREEN)
    canvas.rect(0, letter[1] - 0.4 * inch, letter[0], 0.4 * inch, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(0.5 * inch, letter[1] - 0.27 * inch,
                      "AI IN FACILITY MAINTENANCE — RESEARCH REPORT 2026")
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(letter[0] - 0.5 * inch, letter[1] - 0.27 * inch,
                           "CONFIDENTIAL")
    # Footer
    canvas.setFillColor(MID_GREY)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(0.5 * inch, 0.35 * inch,
                      f"Generated {date.today().strftime('%B %d, %Y')}  •  Prepared for internal use")
    canvas.drawRightString(letter[0] - 0.5 * inch, 0.35 * inch,
                           f"Page {doc.page}")
    canvas.setStrokeColor(TABLE_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(0.5 * inch, 0.5 * inch, letter[0] - 0.5 * inch, 0.5 * inch)
    canvas.restoreState()


def build_cover(styles):
    story = []

    # Full-page color block (simulated with big table)
    title_para = Paragraph(
        "AI IN FACILITY<br/>MAINTENANCE",
        styles["cover_title"]
    )
    subtitle_para = Paragraph(
        "How Landscaping, Snow Removal &amp; General Contracting<br/>"
        "Companies Can Leverage Artificial Intelligence<br/>to Transform Their Operations",
        styles["cover_subtitle"]
    )
    spacer1 = Spacer(1, 0.3 * inch)
    divider = HRFlowable(width="60%", thickness=1, color=ACCENT_GOLD,
                         hAlign="CENTER", spaceAfter=16, spaceBefore=8)
    date_para = Paragraph(
        f"Research Report  •  May 2026  •  Prepared for Internal Use",
        styles["cover_meta"]
    )

    cover_tbl = Table(
        [[title_para], [spacer1], [subtitle_para], [divider], [date_para]],
        colWidths=[7.5 * inch]
    )
    cover_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), DARK_GREEN),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 40),
        ("RIGHTPADDING", (0, 0), (-1, -1), 40),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))

    story.append(Spacer(1, 1 * inch))
    story.append(cover_tbl)
    story.append(Spacer(1, 0.5 * inch))

    # Tagline box
    tagline = Table(
        [[Paragraph(
            "Early adopters of AI in facility maintenance will have a structural cost and speed advantage "
            "within 18–24 months. This report identifies exactly where to start.",
            ParagraphStyle("tl", parent=styles["body"], fontSize=11, leading=17,
                           fontName="Helvetica-BoldOblique", textColor=DARK_GREEN,
                           alignment=TA_CENTER)
        )]],
        colWidths=[6.5 * inch]
    )
    tagline.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_GREEN),
        ("BOX", (0, 0), (-1, -1), 2, LIGHT_GREEN),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
    ]))
    story.append(tagline)
    story.append(PageBreak())
    return story


def build_toc(styles):
    story = []
    story += section_header("TABLE OF CONTENTS", styles, 1)
    story.append(Spacer(1, 0.1 * inch))

    sections = [
        ("Executive Summary", "3"),
        ("Key Statistics at a Glance", "4"),
        ("Sector 1: Landscaping", "5"),
        ("  — Current AI Adoption", "5"),
        ("  — Workflow Problems AI Solves", "5"),
        ("  — Tools & Applications", "6"),
        ("  — ROI & Efficiency Gains", "7"),
        ("  — Near-Future Opportunities", "7"),
        ("Sector 2: Snow Removal", "8"),
        ("  — Current AI Adoption", "8"),
        ("  — Workflow Problems AI Solves", "8"),
        ("  — Tools & Applications", "9"),
        ("  — ROI & Efficiency Gains", "10"),
        ("  — Near-Future Opportunities", "10"),
        ("Sector 3: General Contracting", "11"),
        ("  — Current AI Adoption", "11"),
        ("  — Workflow Problems AI Solves", "11"),
        ("  — Tools & Applications", "12"),
        ("  — ROI & Efficiency Gains", "13"),
        ("  — Near-Future Opportunities", "14"),
        ("Implementation Roadmap: Where to Start", "15"),
        ("Overcoming Barriers to Adoption", "17"),
        ("Sources & References", "18"),
    ]

    for title, pg in sections:
        st = styles["toc_sub"] if title.startswith("  ") else styles["toc_entry"]
        dots = "." * max(2, 65 - len(title))
        row = Table(
            [[Paragraph(title.strip(), st),
              Paragraph(pg, ParagraphStyle("pg", parent=st, alignment=TA_RIGHT))]],
            colWidths=[5.5 * inch, 1.0 * inch]
        )
        row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(row)

    story.append(PageBreak())
    return story


def build_executive_summary(styles):
    story = []
    story += section_header("EXECUTIVE SUMMARY", styles, 1)

    story.append(Paragraph(
        "Facility maintenance companies across landscaping, snow removal, and general contracting "
        "are at an inflection point. Artificial intelligence is no longer a futuristic concept — "
        "it is actively being deployed by leading competitors right now, and the gap between early "
        "adopters and the rest of the market is widening.",
        styles["body"]
    ))

    cols = [
        ("Landscaping", "Lowest AI adoption (17% of companies). Biggest early-mover advantage. "
         "AI tools for aerial takeoff, automated scheduling, AI receptionists, and robotic mowing "
         "are all commercially available today."),
        ("Snow Removal", "Most reactive business model — making AI weather intelligence and "
         "automated dispatch the highest-impact investments. GPS documentation now critical "
         "for liability protection."),
        ("General Contracting", "Most mature AI adoption. 87% of GCs believe AI will meaningfully "
         "impact their business. Platforms like Procore now include full AI agent builders. "
         "Highest stakes for AI in safety, project risk, and subcontractor compliance."),
    ]

    for sector, desc in cols:
        row = Table(
            [[Paragraph(sector, ParagraphStyle("sh", parent=styles["h3"],
                                               textColor=WHITE, spaceBefore=0, spaceAfter=0)),
              Paragraph(desc, styles["body_sm"])]],
            colWidths=[1.4 * inch, 5.1 * inch]
        )
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), MID_GREEN),
            ("BACKGROUND", (1, 0), (1, 0), PALE_GREEN),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ]))
        story.append(row)
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 8))
    story.append(highlight_box(
        "The core opportunity: AI tools that deliver immediate, measurable ROI — aerial measurement, "
        "AI phone answering, subcontractor compliance automation, and route optimization — are available "
        "today at accessible price points. Companies that implement even two of these tools in the next "
        "90 days will outperform non-adopters within a single season.",
        styles
    ))
    story.append(PageBreak())
    return story


def build_key_stats(styles):
    story = []
    story += section_header("KEY STATISTICS AT A GLANCE", styles, 1)

    story.append(Paragraph(
        "These numbers define the opportunity — and the urgency — of AI adoption in facility maintenance.",
        styles["body"]
    ))
    story.append(Spacer(1, 0.1 * inch))

    stats = [
        ("83%", "of landscaping companies\nhaven't tried AI yet"),
        ("95%", "time savings on property\ntakeoff with AI tools"),
        ("20%", "reduction in snow removal\ntime (Denver DOT, 2025)"),
        ("60%", "drop in insurance payouts\nfrom GPS documentation"),
    ]
    story.append(stat_row(stats, styles))
    story.append(Spacer(1, 0.15 * inch))

    stats2 = [
        ("300%+", "ROI on AI predictive\nmaintenance in 18–24 mo"),
        ("40–60%", "of inbound calls missed\nduring field hours"),
        ("87%", "of GCs believe AI will\nimpact their business"),
        ("$7.5B", "robotic mower market\n(2026, growing 11.4% CAGR)"),
    ]
    story.append(stat_row(stats2, styles))
    story.append(Spacer(1, 0.2 * inch))

    story.append(highlight_box(
        "Key insight: Only 17% of landscaping professionals have tried any AI tool (Aspire, 2025 "
        "Landscape Industry Report, n=1,000+). The 83% who haven't adopted yet represent the "
        "competitive landscape you're operating in — and the window to differentiate is open right now.",
        styles
    ))
    story.append(PageBreak())
    return story


def build_landscaping(styles):
    story = []
    story += section_header("SECTOR 1: LANDSCAPING", styles, 1)

    # --- Adoption ---
    story += section_header("Current AI Adoption", styles, 2)
    story.append(Paragraph(
        "According to the 2025 Landscape Industry Report (Aspire, surveying 1,000+ landscape business owners):",
        styles["body"]
    ))
    bullets = [
        "Only <b>17% of landscaping companies</b> have tried AI tools",
        "<b>83% have not adopted AI</b> — cost (50%), lack of time (49%), and learning curve (43%) cited as top barriers",
        "<b>93%</b> already use some form of business software — digital infrastructure exists",
        "<b>73%</b> say digital transformation is 'somewhat or very important' to their future",
        "Landscaping companies using modern tech stacks <b>grow revenue at 2× the rate</b> of non-users",
    ]
    for b in bullets:
        story.append(Paragraph(f"• {b}", styles["bullet"]))
    story.append(Spacer(1, 6))

    # --- Workflow Problems ---
    story += section_header("Workflow Problems AI Can Solve", styles, 2)
    headers = ["Problem Area", "Business Impact"]
    rows = [
        ["Manual property measurement / takeoff for estimating", "Hours per bid; error-prone; limits bid volume"],
        ["Inefficient crew routing with static schedules", "Fuel waste, overtime, coverage gaps"],
        ["Missed inbound leads during field hours", "40–60% of calls go unanswered = lost revenue"],
        ["Irrigation water waste", "30–50% over-watering common without smart controls"],
        ["Reactive equipment maintenance", "Breakdowns during peak season disrupt job schedules"],
        ["Slow client presentations (hand-drawn plans)", "Longer sales cycle, lower close rate"],
        ["Office admin bottlenecks", "Owners spend 15+ hrs/week on invoicing, job costing"],
    ]
    story.append(make_table(headers, rows, [3.0 * inch, 3.5 * inch], styles))
    story.append(Spacer(1, 8))

    # --- Tools ---
    story += section_header("AI Tools & Applications", styles, 2)

    tools = [
        ("A. Estimating & Aerial Takeoff — Highest Immediate ROI",
         [
             ("<b>Attentive.ai (Automeasure)</b>: Automatically measures lawns, mulch beds, hedges, hardscape, "
              "and irrigation zones from aerial imagery. Reports 95% time savings and 98%+ accuracy. "
              "Integrated with LMN (February 2025). 800+ contractors using it. Best for commercial / multi-site accounts."),
             ("<b>Beam AI</b>: Cloud-based takeoff for landscaping and snow. Provides finished estimates "
              "in 2–3 days with human review. Users report 15–20 hrs/week saved and ability to bid 3–5× more projects."),
             ("<b>SiteRecon</b>: AI takeoff and measurement with AI agents in development (2026) for end-to-end "
              "estimating on multi-site RFP responses. Integrates with common landscape management platforms."),
         ]),
        ("B. Business Management Platforms with Embedded AI",
         [
             ("<b>Aspire Software</b>: Most feature-complete for mid-to-large companies ($5M+ revenue). "
              "Includes AI smart routing, PropertyIntel for AI-measured site mapping, predictive analytics, "
              "and job costing AI. Published 'Agentic AI' roadmap for autonomous operations in 2026."),
             ("<b>LMN (Landscape Management Network)</b>: Mid-market platform (merged with SingleOps, 2024). "
              "February 2025 integration with Attentive.ai for aerial measurement directly inside estimates."),
             ("<b>Jobber</b>: Best for small operations (1–15 employees, $29–$529/month). AI Receptionist "
              "(launched August 2025) answers calls 24/7, books visits, and texts missed callers. "
              "AI quoting and route optimization built in."),
             ("<b>LeanScaper</b>: AI operating system for landscaping with 'Lana' AI assistant. Learns your "
              "business from uploaded docs (SOPs, pricing, job notes). Designed for companies up to 15 crews."),
         ]),
        ("C. Design & Client Presentation Tools",
         [
             ("<b>PRO Landscape+</b>: AI Outdoor Living Designer generates complete outdoor living concepts "
              "from a client photo. AI Paver Tool provides 1,000+ manufacturer patterns. Expanded Feb 2026."),
             ("<b>iScape</b>: AR app that places trees, shrubs, and hardscape onto a client's actual yard "
              "using their smartphone camera in real time — dramatically shortens the sales cycle."),
         ]),
        ("D. Irrigation & Environmental Monitoring",
         [
             ("<b>Smart ET Controllers</b> (Rachio, Rain Bird ESP-TM3, Hunter Hydrawise): "
              "AI-enhanced weather-based irrigation that adjusts schedules using real-time ET data, "
              "soil moisture sensors, and wind conditions. Research shows 30–50% water savings."),
         ]),
        ("E. Robotic Mowing — Emerging but Accelerating",
         [
             ("<b>Honda ProZision Autonomous ZTR</b>: Battery-powered 60\" commercial ZTR, $33,000 MSRP, "
              "2026 availability. Operator teaches path once; mower operates solo thereafter."),
             ("<b>Husqvarna CEORA, Scythe M.52, Graze</b>: AI-navigated commercial mowers using "
              "RTK GPS, LiDAR, and vision systems. Global robotic mower market: $7.5B in 2026 "
              "growing at 11.4% CAGR to $15.9B by 2033."),
             ("Business case: Deploy on large, flat commercial accounts (office parks, HOA commons) "
              "to free crews for higher-margin, complex work."),
         ]),
        ("F. Predictive Equipment Maintenance",
         [
             ("<b>Whip Around</b>: IoT sensor data + maintenance history to predict equipment failures. "
              "Matches crews, vehicles, and equipment to jobs based on availability and skill sets."),
             ("<b>Fleetio / Samsara / Verizon Connect</b>: Telematics platforms using AI to flag early "
              "engine warning signs — reducing unplanned downtime by up to 75% on 50+ unit fleets."),
         ]),
    ]

    for title, items in tools:
        story.append(Paragraph(title, styles["h3"]))
        for item in items:
            story.append(Paragraph(f"• {item}", styles["bullet"]))
        story.append(Spacer(1, 4))

    # --- ROI ---
    story += section_header("ROI & Efficiency Gains", styles, 2)
    headers = ["Tool / Application", "Documented Gain"]
    rows = [
        ["Aerial takeoff (Attentive.ai)", "95% time savings on estimating; 50% more jobs bid"],
        ["Beam AI takeoff service", "15–20 hrs/week saved; 3–5× bid volume"],
        ["Modern platform adoption (Aspire)", "346% ROI from modernizing tech stack; 2× revenue growth rate"],
        ["AI Receptionist (Jobber)", "Recovers 40–60% of previously missed leads"],
        ["AI predictive maintenance", "40% maintenance cost reduction; $500K–$750K/yr on 50-unit fleet"],
        ["Smart irrigation controllers", "30–50% water usage reduction"],
        ["Robotic mowing (commercial)", "Eliminates 1 labor position per 2–3 deployed units on compatible accounts"],
    ]
    story.append(make_table(headers, rows, [3.2 * inch, 3.3 * inch], styles))
    story.append(Spacer(1, 8))

    # --- Near Future ---
    story += section_header("Near-Future Opportunities (1–3 Years)", styles, 2)
    futures = [
        "<b>Agentic AI operations</b>: Autonomous agents that re-route crews on weather changes, "
        "reschedule jobs when equipment goes down, and flag jobs trending toward cost overruns — "
        "without manager intervention. (Aspire Agentic AI roadmap, 2026)",
        "<b>Computer vision site inspection</b>: Upload drone or smartphone photos; AI flags weed pressure, "
        "disease, irrigation failures, and turf health issues before the client notices.",
        "<b>Bundled commercial bidding AI</b>: SiteRecon AI agents (2026) for end-to-end multi-site RFP "
        "response — measure, scope, price, and generate proposals autonomously.",
        "<b>Labor optimization</b>: AI scheduling that matches available workers to jobs based on skills, "
        "location, and job requirements — critical as labor shortages intensify.",
        "By <b>2028</b>, GreenPal research projects AI will be actively involved in estimating, scheduling, "
        "marketing automation, and customer communication for the majority of landscaping companies.",
    ]
    for f in futures:
        story.append(Paragraph(f"• {f}", styles["bullet"]))

    story.append(PageBreak())
    return story


def build_snow(styles):
    story = []
    story += section_header("SECTOR 2: SNOW REMOVAL", styles, 1)

    story.append(highlight_box(
        "Snow removal has some of the most compelling near-term AI use cases because the entire business "
        "is reactive by nature — weather drives everything. The companies that predict, prepare, and respond "
        "faster than competitors win. The US Snow Removal & Deicing market is growing at 13.55% CAGR (2024–2030).",
        styles
    ))
    story.append(Spacer(1, 8))

    story += section_header("Current AI Adoption", styles, 2)
    story.append(Paragraph(
        "Early real-world deployments show what is already possible:",
        styles["body"]
    ))
    bullets = [
        "<b>Denver Department of Transportation</b>: 20% reduction in snow removal time after full AI system "
        "deployment (late 2025). System integrates real-time weather forecasts, historical data, and live sensor "
        "feeds to predict accumulation and dynamically adjust routes.",
        "<b>Only Strata Snow Removal</b> (BC, October 2025): First residential-focused company to deploy a fully "
        "integrated AI system combining satellite weather monitoring, road temperature sensors, and predictive "
        "modeling. Automatically dispatches crews <i>before</i> snow or ice appears. Rolled out across 26 cities.",
    ]
    for b in bullets:
        story.append(Paragraph(f"• {b}", styles["bullet"]))
    story.append(Spacer(1, 6))

    story += section_header("Workflow Problems AI Can Solve", styles, 2)
    headers = ["Problem Area", "Business Impact"]
    rows = [
        ["Weather uncertainty — when to mobilize", "Too early = wasted cost; too late = liability"],
        ["Inefficient route planning per storm", "Drivers making real-time decisions waste 20–30% of drive time"],
        ["Salt/brine overuse", "Environmental liability, cost waste, regulatory risk"],
        ["Missing proof-of-service documentation", "Critical legal liability exposure on slip-and-fall claims"],
        ["Property measurement for seasonal bids", "Underbidding destroys margin; overbidding loses contracts"],
        ["Multi-property mobilization coordination", "High dispatcher burden during active storms"],
        ["Equipment readiness in sudden-onset storms", "Breakdowns during peak demand are catastrophic"],
    ]
    story.append(make_table(headers, rows, [3.0 * inch, 3.5 * inch], styles))
    story.append(Spacer(1, 8))

    story += section_header("AI Tools & Applications", styles, 2)

    tools = [
        ("A. Weather Intelligence & Predictive Dispatch — Core Competitive Advantage",
         [
             ("<b>Weathernews Snowfall Accumulation Model</b>: ML model trained on 124 years of weather data. "
              "Estimates accumulation from air temp, precipitation intensity, humidity, wind speed, road surface "
              "temp, and upper-air conditions. Available via API for dispatch integration."),
             ("<b>WeatherTrends360</b>: Statistical modeling with 85% total forecast accuracy. Used to anticipate "
              "demand spikes and optimize staffing weeks in advance."),
             ("<b>DTN / Weather Decision Technologies</b>: Enterprise hyper-local forecasting that integrates "
              "with dispatch systems to trigger automatic crew alerts when accumulation thresholds are met."),
         ]),
        ("B. Aerial Measurement for Bidding — Highest Immediate ROI for Snow Companies",
         [
             ("<b>Attentive.ai (Automeasure)</b>: Purpose-built for snow contractors. Instantly measures "
              "drive lanes, parking spots, and sidewalk footage from aerial imagery. Users report "
              "bidding 2× more snow removal jobs at the same overhead."),
             ("<b>Beam AI Snow Module</b>: ~90% reduction in takeoff time for snow contractors. "
              "Drive lanes, sidewalks, and parking areas measured from uploaded aerial imagery."),
         ]),
        ("C. Route Optimization",
         [
             ("<b>Upper Route Planner</b>: AI route optimization for snow plow fleets. Factors in time "
              "windows, accumulation rates, traffic, and customer priorities. Best for 10–100 stops per truck."),
             ("<b>ServiceTitan</b>: Visual scheduling board with weather integration and multi-crew dispatch. "
              "Best for companies with 20+ trucks."),
             ("<b>Jobber / FieldCamp</b>: Accessible route optimization and dispatch for smaller operations."),
         ]),
        ("D. GPS Tracking, Telematics & Proof of Service",
         [
             ("<b>Geotab / Envue Telematics</b>: Full telematics with plow-down detection, spreader monitoring, "
              "route compliance verification, and proof-of-service documentation. "
              "Edison Township, NJ reduced insurance payouts by 60% after deploying GPS/video telematics."),
             ("<b>TitanGPS Snow Plow Tracker</b>: Real-time GPS with plow blade status detection."),
             ("<b>Service Autopilot</b>: Automated service documentation with timestamped photos and "
              "GPS records. Auto-generates client-facing service logs from sensor data."),
         ]),
        ("E. Smart Salt & Brine Management",
         [
             ("<b>Sensor-equipped spreader controllers</b> (SnowEx, SaltDogg with GPS): AI-enabled controllers "
              "that calibrate spread rates based on GPS speed. Combined with pavement temperature sensors, "
              "ensure deicers applied only where and when needed — 20–35% material cost reduction."),
             ("Only Strata's integrated approach applies eco-friendly deicers only in specific high-risk zones "
              "(shaded walkways, steep ramps) before freezing occurs — not blanket treatment after the fact."),
         ]),
        ("F. Near-Future: Autonomous Equipment",
         [
             ("<b>Teleo remote operation</b>: Retrofits existing plow trucks for remote or semi-autonomous "
              "operation without purchasing new equipment. Reduces need for drivers in hazardous nighttime conditions."),
             ("Fully autonomous snowplows currently in municipal testing. Commercial deployment at scale: "
              "3–5 years. Remote-assist technology available now."),
         ]),
    ]

    for title, items in tools:
        story.append(Paragraph(title, styles["h3"]))
        for item in items:
            story.append(Paragraph(f"• {item}", styles["bullet"]))
        story.append(Spacer(1, 4))

    story += section_header("ROI & Efficiency Gains", styles, 2)
    headers = ["Application", "Documented Gain"]
    rows = [
        ["Aerial measurement (Attentive.ai)", "2× bid volume; 90% takeoff time reduction"],
        ["AI route optimization", "20% reduction in removal time (Denver DOT case, 2025)"],
        ["GPS telematics + documentation", "60% reduction in insurance payouts (Edison, NJ case)"],
        ["AI weather forecasting", "Resource pre-positioning 24–48 hrs in advance"],
        ["Smart spreader control", "20–35% material cost reduction"],
        ["Automated dispatch", "Eliminates overnight manager monitoring; 24/7 autonomous mobilization"],
    ]
    story.append(make_table(headers, rows, [3.2 * inch, 3.3 * inch], styles))
    story.append(Spacer(1, 8))

    story += section_header("Near-Future Opportunities (1–3 Years)", styles, 2)
    futures = [
        "<b>Fully automated storm response</b>: Monitor weather 24/7, automatically mobilize crews when "
        "accumulation thresholds are hit, dispatch optimized routes, track completion, and generate "
        "client documentation — with zero dispatcher phone calls.",
        "<b>Dynamic contract pricing AI</b>: Analyzes historical storm frequency, intensity, and actual "
        "cost data by property to optimize seasonal contract pricing — eliminating underbid/overbid guesswork.",
        "<b>Predictive equipment readiness</b>: AI that monitors plow truck health through the off-season "
        "and flags components likely to fail at season start.",
        "<b>Client portal AI</b>: Real-time plow tracking, proof-of-service photos, and accumulation data "
        "for clients — reducing service calls and improving contract renewal rates.",
    ]
    for f in futures:
        story.append(Paragraph(f"• {f}", styles["bullet"]))

    story.append(PageBreak())
    return story


def build_gc(styles):
    story = []
    story += section_header("SECTOR 3: GENERAL CONTRACTING", styles, 1)

    story.append(highlight_box(
        "General contracting has the most mature AI adoption of the three sectors. According to a 2025 "
        "Dodge Construction Network study, 87% of contractors believe AI will have a meaningful impact "
        "on their business. The AI construction market is projected to surpass $4.5 billion by 2026 — "
        "a 2.5× increase from 2024.",
        styles
    ))
    story.append(Spacer(1, 8))

    story += section_header("Current AI Adoption", styles, 2)
    story.append(Paragraph(
        "AI adoption in construction skews toward large commercial GCs but tools are rapidly becoming "
        "accessible to mid-size ($5M–$50M revenue) general contractors. The highest-impact shift: "
        "major platforms like Procore are now embedding AI agents directly into field workflows, not "
        "just back-office analytics.",
        styles["body"]
    ))
    story.append(Spacer(1, 6))

    story += section_header("Workflow Problems AI Can Solve", styles, 2)
    headers = ["Problem Area", "Business Impact"]
    rows = [
        ["Manual quantity takeoffs from plans", "20–40 hours per bid; errors cause margin erosion"],
        ["Missed inbound calls while team is on site", "$1,200–$8,500 value lost per missed call"],
        ["Contract and subcontract risk review", "Expensive legal review; missed obligations cause disputes"],
        ["Subcontractor insurance compliance tracking", "Hours of admin per project; lapsed coverage = liability"],
        ["Job site safety monitoring", "Construction = 21% of all US workplace deaths"],
        ["Project schedule variance and delay prediction", "Average project runs 20% over schedule"],
        ["Material procurement cost overruns", "25–40% of projects exceed material budgets"],
        ["Daily reporting and documentation burden", "Supers spend 2–4 hrs/day on paperwork"],
    ]
    story.append(make_table(headers, rows, [3.0 * inch, 3.5 * inch], styles))
    story.append(Spacer(1, 8))

    story += section_header("AI Tools & Applications", styles, 2)

    tools = [
        ("A. Estimating & Takeoff",
         [
             ("<b>Beam AI</b>: AI takeoff platform that reads construction drawings and extracts material "
              "and scope data. Covers structural, MEP, and site work. 70–90% reduction in estimating hours. "
              "Also handles landscaping and snow removal in the same platform."),
             ("<b>STACK</b>: Eliminates manual measurements from 2D plans. Improves win rates and increases "
              "bid volume without hiring additional estimators. 7-day free trial."),
             ("<b>Downtobid</b>: AI copilot that performs page-turn process, identifies all major trades, "
              "generates scope summaries, and matches scope items with qualified local subcontractors."),
             ("<b>ConstructionBids.ai</b>: Entry-level bid management with AI features at $29/month."),
         ]),
        ("B. Project Management Platforms with Native AI",
         [
             ("<b>Procore + Procore Helix (AI Layer)</b>: Major AI development unveiled at Groundbreak 2025. "
              "Procore Assist answers questions from specs, RFIs, submittals, and building codes in seconds. "
              "Agent Builder lets customers create custom AI agents — no coding required. Pre-built RFI "
              "Creation Agent and Daily Log Agent available today."),
             ("<b>Buildertrend</b>: Best for small-to-mid residential and light commercial GCs. "
              "AI features in scheduling, communication, and client-facing portals."),
             ("<b>Oracle Primavera</b>: Enterprise-level project controls with AI for schedule compression, "
              "resource leveling, and risk prediction."),
         ]),
        ("C. Document & Contract Management",
         [
             ("<b>Document Crunch</b>: AI contract review platform. Scans contracts and specs to identify risks, "
              "obligations, and compliance gaps. Delivers actionable guidance. Dramatically reduces reliance "
              "on expensive legal review for standard commercial contracts."),
             ("<b>Briq</b>: Financial automation for construction. AI budget tracking, cash flow forecasting, "
              "and variance analysis across projects — connecting field data to financial reporting automatically."),
         ]),
        ("D. Safety Monitoring via Computer Vision",
         [
             ("<b>Visionify / viAct / Spot AI</b>: Analyze video feeds from job site cameras to detect PPE "
              "violations (missing hard hats, high-vis vests), fall hazards, unauthorized zone entry, and "
              "unsafe behaviors in real time. Construction sites using AI safety monitoring report "
              "30–40% reduction in workplace incidents."),
             ("<b>DroneDeploy Safety AI</b> (late 2025): Vision-language model AI agent that analyzes drone "
              "footage and 360° imagery to flag hazards across the entire site."),
         ]),
        ("E. Subcontractor Insurance Compliance — Underutilized, Immediate ROI",
         [
             ("<b>illumend.ai</b>: Automatically extracts policy information from Certificates of Insurance, "
              "compares coverage against project requirements, and flags lapsed or insufficient coverage."),
             ("<b>myCOI</b>: Continuously reviews subcontractor insurance documents, sends automated renewal "
              "alerts, and flags compliance gaps in real time — not just at project start."),
             ("<b>Billy for Insurance</b>: Allows field teams to verify subcontractor compliance "
              "before crews arrive on site."),
             ("Impact: 60–80% reduction in admin time spent on insurance tracking. A GC managing "
              "50+ subcontractors can save dozens of hours per month."),
         ]),
        ("F. Site Monitoring & Progress Tracking",
         [
             ("<b>Track3D / DroneDeploy Progress AI</b>: Consolidates drone, 360° camera, and LiDAR data "
              "to deliver real-time progress tracking vs. design models. Flags deviations before they become delays."),
             ("<b>Hover / OpenDroneMap</b>: More accessible drone-based site measurement tools for "
              "accurate measurements and 3D models from drone footage."),
         ]),
        ("G. Customer Communication & Lead Management",
         [
             ("<b>Goodcall / Rosie / Jobber AI Receptionist</b>: Virtual receptionists that answer calls "
              "24/7, capture lead details, schedule consultations, and follow up automatically. "
              "Addresses the industry's biggest lead leakage point — missed calls while on site."),
             ("<b>CRM + AI</b> (HubSpot AI, Salesforce Einstein): Scores leads, suggests follow-up timing, "
              "drafts proposal emails, and predicts close probability from historical win/loss data."),
         ]),
        ("H. Predictive Equipment Maintenance",
         [
             ("<b>FleetRabbit</b>: AI predictive maintenance for construction equipment fleets. "
              "Combines IoT sensor data with maintenance history. ML models detect hydraulic pressure "
              "variance, coolant temperature deviations, and injector degradation before fault codes trigger."),
             ("Industry benchmark: Equipment downtime drops from 14% to under 8% of annual "
              "operating hours for early adopters. 300–400% ROI within 18–24 months."),
         ]),
    ]

    for title, items in tools:
        story.append(Paragraph(title, styles["h3"]))
        for item in items:
            story.append(Paragraph(f"• {item}", styles["bullet"]))
        story.append(Spacer(1, 4))

    story += section_header("ROI & Efficiency Gains", styles, 2)
    headers = ["Application", "Documented Gain"]
    rows = [
        ["AI estimating / takeoff", "70–90% reduction in takeoff time; 30–45% improvement in estimate conversion"],
        ["AI phone / lead capture", "Recovers 40–60% of missed leads ($1,200–$8,500 per call)"],
        ["Procore AI (document & workflow)", "50% reduction in document handling time; daily logs automated"],
        ["AI safety monitoring (computer vision)", "30–40% reduction in workplace incidents"],
        ["AI contract review (Document Crunch)", "Hours → minutes per contract; reduced legal costs"],
        ["AI subcontractor insurance (illumend/myCOI)", "60–80% admin time reduction per project"],
        ["AI predictive maintenance (fleet)", "40% maintenance cost reduction; 300–400% ROI in 18–24 months"],
        ["AI project risk identification", "30% faster risk identification; 20% labor efficiency improvement"],
    ]
    story.append(make_table(headers, rows, [3.2 * inch, 3.3 * inch], styles))
    story.append(Spacer(1, 8))

    story += section_header("Near-Future Opportunities (1–3 Years)", styles, 2)
    futures = [
        "<b>Autonomous project agents</b>: Procore's Agent Builder roadmap points to custom AI agents that "
        "independently manage RFI routing, submittal tracking, change order drafting, and schedule updates "
        "within 1–2 years.",
        "<b>AI-driven subcontractor selection</b>: Platforms that score bids not just on price but on "
        "historical performance data (completion rate, defect rates, change order frequency) to predict "
        "actual project outcomes.",
        "<b>Real-time cost forecasting</b>: AI that monitors field productivity in real time and updates "
        "the cost-to-complete estimate continuously — giving a 30-day warning before a job goes red.",
        "<b>Autonomous site inspection drones</b>: Daily autonomous drone flights generating AI-analyzed "
        "progress reports, safety audits, and quality inspections. DroneDeploy's three AI agents "
        "(Safety AI, Progress AI, Inspection AI) represent the leading edge of this trend.",
        "<b>AI contract drafting</b>: From template to customized contract in minutes, with risk clauses "
        "tuned to project type, client history, and current market conditions.",
    ]
    for f in futures:
        story.append(Paragraph(f"• {f}", styles["bullet"]))

    story.append(PageBreak())
    return story


def build_roadmap(styles):
    story = []
    story += section_header("IMPLEMENTATION ROADMAP: WHERE TO START", styles, 1)

    story.append(Paragraph(
        "This prioritized roadmap is designed for a facility maintenance company operating across "
        "landscaping, snow removal, and/or general contracting. Priorities are ranked by speed-to-ROI "
        "and implementation complexity.",
        styles["body"]
    ))
    story.append(Spacer(1, 8))

    phases = [
        (
            "PHASE 1 — IMMEDIATE (0–3 Months)",
            "Fast payback, low implementation risk. Start here.",
            ACCENT_GOLD,
            [
                ("1", "AI Aerial Measurement for Estimating",
                 "Attentive.ai or Beam AI",
                 "All sectors",
                 "Implement for all new bids. Pays for itself in the first month. "
                 "Works for landscaping, snow, and site maintenance simultaneously. "
                 "Immediately increases bid volume and accuracy."),
                ("2", "AI Phone Answering / AI Receptionist",
                 "Jobber AI Receptionist, Goodcall, or Rosie",
                 "All sectors",
                 "Recovers leads currently being lost during field hours. "
                 "Measurable ROI from week one. $29–$99/month at entry level."),
                ("3", "AI Subcontractor Insurance Compliance",
                 "illumend.ai or myCOI",
                 "GC / Snow (subs)",
                 "If you manage subcontractors, this eliminates dozens of admin hours/month "
                 "and reduces legal exposure. Immediate, quantifiable time savings."),
            ]
        ),
        (
            "PHASE 2 — NEAR-TERM (3–12 Months)",
            "Platform-level AI adoption. Most impactful long-term investment.",
            MID_GREEN,
            [
                ("4", "Upgrade to AI-Enabled Operations Platform",
                 "Aspire (large), LMN + Attentive.ai (mid), Procore/Buildertrend (GC)",
                 "Sector-specific",
                 "Single biggest long-term investment. Aspire for landscaping/snow at scale. "
                 "LMN with Attentive.ai integration for mid-market. "
                 "Procore or Buildertrend for general contracting."),
                ("5", "Route Optimization for Crews",
                 "Upper, Jobber, or ServiceTitan",
                 "Landscaping / Snow",
                 "Even a 10% route efficiency improvement reduces fuel and overtime measurably "
                 "across a full season. Critical for snow during active storm periods."),
                ("6", "Smart Weather Integration for Snow Dispatch",
                 "Weathernews API or WeatherTrends360",
                 "Snow",
                 "Feed hyper-local weather forecasting into your dispatching workflow. "
                 "Enables crew pre-positioning 24–48 hours in advance and eliminates "
                 "reactive scrambling."),
            ]
        ),
        (
            "PHASE 3 — MEDIUM-TERM (12–24 Months)",
            "Competitive differentiation. Structural advantages that compound over time.",
            DARK_GREEN,
            [
                ("7", "Predictive Equipment Maintenance",
                 "Whip Around, Fleetio, or Samsara",
                 "All sectors",
                 "Invest in telematics for heavy equipment fleet. Data collected now enables "
                 "AI failure predictions within 12–18 months. 300–400% ROI documented "
                 "within 18–24 months on 50+ unit fleets."),
                ("8", "AI Design & Client Presentation Tools",
                 "PRO Landscape+ or iScape",
                 "Landscaping",
                 "For design/build accounts, AI-generated visualizations shorten the sales "
                 "cycle and increase close rates. Particularly powerful for high-value "
                 "residential and commercial design work."),
                ("9", "Autonomous Mowing Pilot",
                 "Honda ProZision, Husqvarna CEORA, or Scythe M.52",
                 "Landscaping",
                 "If you have commercial accounts with large, flat turf, pilot 1–2 robotic mowers. "
                 "Economics improving rapidly. Frees crews for higher-margin complex work."),
                ("10", "Computer Vision Safety Monitoring",
                 "Visionify, Spot AI, or viAct",
                 "GC",
                 "As operations scale or on complex commercial sites, AI safety monitoring "
                 "is increasingly a differentiator in commercial contract bids. "
                 "30–40% reduction in workplace incidents documented."),
            ]
        ),
    ]

    for phase_title, phase_desc, color, items in phases:
        # Phase header
        ph = Table(
            [[Paragraph(phase_title, ParagraphStyle(
                "ph", parent=styles["h2"], textColor=WHITE, spaceBefore=0, spaceAfter=0
            ))],
             [Paragraph(phase_desc, ParagraphStyle(
                 "pd", parent=styles["body_sm"], textColor=colors.HexColor("#CFD8DC"),
                 spaceAfter=0
             ))]],
            colWidths=[6.5 * inch]
        )
        ph.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ]))
        story.append(ph)
        story.append(Spacer(1, 4))

        # Items table
        headers = ["#", "Action", "Tool(s)", "Sector", "Why It Matters"]
        rows_data = [[n, a, t, sec, why] for n, a, t, sec, why in items]
        tbl = make_table(headers, rows_data,
                         [0.2 * inch, 1.3 * inch, 1.5 * inch, 0.8 * inch, 2.7 * inch],
                         styles)
        story.append(tbl)
        story.append(Spacer(1, 12))

    story.append(PageBreak())
    return story


def build_barriers(styles):
    story = []
    story += section_header("OVERCOMING BARRIERS TO ADOPTION", styles, 1)

    story.append(Paragraph(
        "Three sectors share common barriers. Here is how to address each one pragmatically.",
        styles["body"]
    ))
    story.append(Spacer(1, 8))

    barriers = [
        ("Cost (50% of landscapers cite this)",
         "Start with tools that have clear, immediate ROI. An AI takeoff tool or AI receptionist pays for "
         "itself in weeks. Attentive.ai charges per measurement — no subscription required, low-risk trial. "
         "LeanScaper and Jobber start under $100/month. Focus the first dollar on tools where ROI is "
         "calculable before you commit."),
        ("Lack of Time to Implement (49%)",
         "Choose platforms built for your industry — not generic AI tools. LeanScaper, Aspire, and LMN "
         "are designed so field crews and non-technical owners can use them without IT support. "
         "Pilot one tool for one specific workflow (e.g., estimating only) before expanding. "
         "Beam AI is fully managed — upload a plan, receive a finished estimate."),
        ("Learning Curve (43%)",
         "Most modern tools require no coding or AI expertise. The best ones (Jobber AI Receptionist, "
         "Attentive.ai, myCOI) work with minimal setup. Start with a tool that automates something "
         "you currently do manually — the 'before/after' is immediately visible to the team."),
        ("Data Quality Concerns",
         "This is the most legitimate long-term barrier. The fix: start capturing structured data now. "
         "Consistent job cost codes, digital daily logs, structured bid data. Even basic platforms "
         "create the data foundation that makes AI predictions possible in 12–18 months. "
         "The companies starting this now will have a measurable advantage."),
        ("Seasonal Business ROI Uncertainty (Snow)",
         "Focus on tools that pay during the bidding season (spring/summer), not just winter operations. "
         "Aerial measurement tools generate ROI year-round if used for landscaping bids too. "
         "Frame weather AI as 'insurance' against late mobilization liability, not a scheduling luxury."),
        ("Workforce Adoption (GC)",
         "AI that helps workers do their jobs — auto-generating daily logs, auto-filling RFIs, "
         "answering compliance questions — creates adoption pull rather than resistance. "
         "Frame AI as eliminating paperwork, not replacing people. "
         "Start with tools that save the most time for the people using them."),
    ]

    for title, body in barriers:
        row = Table(
            [[Paragraph(title, ParagraphStyle(
                "bt", parent=styles["h3"], textColor=WHITE, spaceBefore=0, spaceAfter=0
            )),
              Paragraph(body, styles["body_sm"])]],
            colWidths=[1.8 * inch, 4.7 * inch]
        )
        row.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), DARK_GREY),
            ("BACKGROUND", (1, 0), (1, 0), LIGHT_GREY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("BOX", (0, 0), (-1, -1), 0.5, TABLE_BORDER),
        ]))
        story.append(row)
        story.append(Spacer(1, 4))

    story.append(PageBreak())
    return story


def build_sources(styles):
    story = []
    story += section_header("SOURCES & REFERENCES", styles, 1)

    story.append(Paragraph(
        "This report is based on primary research published between 2024–2026. Key sources include:",
        styles["body"]
    ))
    story.append(Spacer(1, 6))

    sources = [
        ("Aspire Software", "2025 Landscape Industry Report (n=1,000+ landscape business owners). "
         "youraspire.com/guides/ai-landscaping-report"),
        ("GreenPal", "AI in Landscaping: Why 83% of Pros Haven't Adopted It Yet (2025). "
         "yourgreenpal.com/blog/ai-in-landscaping"),
        ("Aspire Software", "How Agentic AI Will Transform Landscaping Operations (2026). "
         "youraspire.com/blog/agentic-ai-landscaping-operations"),
        ("Attentive.ai", "LMN and Attentive.ai Announce Strategic Partnership (February 2025). "
         "attentive.ai/blog/lmn-and-attentive-ai-announce-strategic-partnership"),
        ("Attentive.ai", "Top 5 Trends in Snow Removal Technologies. attentive.ai/blog"),
        ("Beam AI", "AI in Construction: Automate Estimating, Contract Analysis & More. "
         "trybeam.com/resources"),
        ("SiteRecon", "How AI Agents Transform Snow Removal & Landscape Estimating in 2026. "
         "order.siterecon.ai/blog"),
        ("Drafix Software", "PRO Landscape+ AI Capabilities Expansion Announcement (February 2026). "
         "prolandscapermagazine.com/us/2026/02"),
        ("Weathernews", "AI Revolutionizes Snow Accumulation Forecasting (December 2025). "
         "global.weathernews.com/blog"),
        ("GlobeNewswire", "Only Strata Snow Removal Integrates AI-Powered Technology (October 2025). "
         "globenewswire.com/news-release/2025/10/06"),
        ("Science Technology News", "AI Revolutionizes Snow Removal: Cities Embrace High-Tech Resilience "
         "(March 2026)."),
        ("Envue Telematics", "Winter-Proof Your Fleet: GPS Telematics for Snow Plow Companies. "
         "envuetelematics.com"),
        ("Upper Route Planner", "6 Best Snow Plow Route Apps 2025. upperinc.com/blog"),
        ("Procore", "Procore Advances Future of Construction with New AI at Groundbreak 2025. "
         "procore.com/press"),
        ("Procore", "5 Construction Tech Trends in 2026. procore.com/library/voices"),
        ("FleetRabbit", "AI Predictive Maintenance for Construction Equipment Fleets: 2026 Guide. "
         "fleetrabbit.com/blogs"),
        ("Whip Around", "How AI Can Impact Asset Management in Landscaping. whiparound.com/blog"),
        ("illumend.ai", "AI-Powered Insurance Compliance Software For Construction. illumend.ai"),
        ("myCOI", "Using AI to Build Smarter Subcontractor Risk Management. mycoitracking.com"),
        ("Billy for Insurance", "AI-Powered Insurance Compliance for Construction Teams. "
         "billyforinsurance.com"),
        ("viAct", "Computer Vision for PPE Compliance: A New Era of Workplace Safety. viact.ai"),
        ("Spot AI", "OSHA Compliance in the Age of AI (2025). spot.ai/blog"),
        ("ABC Carolinas", "AI in Construction Site Safety: Top Innovations. abccarolinas.org"),
        ("PR Newswire", "MAMMOTION Takes Stage at CES 2026 with Robotic Lawn Mowing Lineup. "
         "prnewswire.com"),
        ("PR Newswire", "Robotic Lawn Mower Market: CAGR 11.4% — Persistence Market Research. "
         "prnewswire.com"),
        ("BuiltWorlds", "40 AI-Driven AEC Solutions to Watch in 2026. builtworlds.com"),
        ("DroneDeploy", "Safety AI, Progress AI, and Inspection AI agents launched (late 2025). "
         "dronedeploy.com"),
        ("Dodge Construction Network", "2025 Construction AI Adoption Study (87% of GCs). "
         "dodgeconstruction.com"),
        ("LeanScaper", "The LeanScaper Platform: AI Tools Built for Landscaping Businesses. "
         "leanscaper.com"),
    ]

    for org, desc in sources:
        story.append(Paragraph(
            f"<b>{org}</b>: {desc}",
            styles["source"]
        ))

    story.append(Spacer(1, 20))
    story.append(hr(TABLE_BORDER, 0.5))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This report was prepared for internal strategic planning purposes. Data reflects published "
        "industry research, vendor documentation, and case studies available as of May 2026. "
        "ROI figures are drawn from vendor-reported and independently documented case studies; "
        "individual results will vary based on company size, implementation quality, and market conditions.",
        styles["body_sm"]
    ))

    return story


def generate():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="AI in Facility Maintenance — Research Report 2026",
        author="Facility Maintenance AI Research",
        subject="Landscaping, Snow Removal, and General Contracting AI Applications",
    )

    styles = build_styles()
    story = []

    story += build_cover(styles)
    story += build_toc(styles)
    story += build_executive_summary(styles)
    story += build_key_stats(styles)
    story += build_landscaping(styles)
    story += build_snow(styles)
    story += build_gc(styles)
    story += build_roadmap(styles)
    story += build_barriers(styles)
    story += build_sources(styles)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    generate()
