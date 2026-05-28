from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

OUTPUT = "/home/user/My-First-Agent/summer_clothes_report.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    leftMargin=0.85*inch,
    rightMargin=0.85*inch,
    topMargin=0.9*inch,
    bottomMargin=0.9*inch,
)

styles = getSampleStyleSheet()

DARK = colors.HexColor("#1a1a1a")
ACCENT = colors.HexColor("#2c5f3f")   # forest green accent
LIGHT_BG = colors.HexColor("#f5f5f0")
MID = colors.HexColor("#555555")
TABLE_HEADER = colors.HexColor("#2c5f3f")
TABLE_ROW_ALT = colors.HexColor("#f0f4f0")

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontSize=22, textColor=DARK, spaceAfter=4, leading=28,
    fontName="Helvetica-Bold", alignment=TA_LEFT,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontSize=10, textColor=MID, spaceAfter=14, leading=14,
    fontName="Helvetica",
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading1"],
    fontSize=13, textColor=ACCENT, spaceBefore=18, spaceAfter=6,
    fontName="Helvetica-Bold", leading=18, borderPadding=(0,0,2,0),
)
note_style = ParagraphStyle(
    "Note", parent=styles["Normal"],
    fontSize=9, textColor=MID, spaceAfter=10, leading=13,
    fontName="Helvetica-Oblique", leftIndent=6,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontSize=9.5, textColor=DARK, spaceAfter=6, leading=14,
    fontName="Helvetica",
)
fit_bullet_style = ParagraphStyle(
    "FitBullet", parent=styles["Normal"],
    fontSize=9.5, textColor=DARK, spaceAfter=5, leading=14,
    fontName="Helvetica", leftIndent=14, firstLineIndent=-10,
)

def make_table(headers, rows):
    col_widths = None
    if len(headers) == 4:
        col_widths = [1.3*inch, 2.2*inch, 0.75*inch, 2.65*inch]
    elif len(headers) == 3:
        col_widths = [1.4*inch, 2.3*inch, 2.6*inch]
    elif len(headers) == 2:
        col_widths = [2.5*inch, 4.1*inch]

    header_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle(
        "TH", parent=styles["Normal"], fontSize=9, textColor=colors.white,
        fontName="Helvetica-Bold", leading=12,
    )) for h in headers]

    data = [header_row]
    for i, row in enumerate(rows):
        styled = [Paragraph(str(cell), ParagraphStyle(
            "TD", parent=styles["Normal"], fontSize=8.5,
            fontName="Helvetica", leading=12, textColor=DARK,
        )) for cell in row]
        data.append(styled)

    style_cmds = [
        ("BACKGROUND", (0,0), (-1,0), TABLE_HEADER),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, TABLE_ROW_ALT]),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t

elements = []

# Title block
elements.append(Paragraph("Summer 2026 Men's Clothing Report", title_style))
elements.append(Paragraph(
    "6'3\" &nbsp;|&nbsp; 195 lbs &nbsp;|&nbsp; Shirt: Large &nbsp;|&nbsp; Pants: 33/32 &nbsp;|&nbsp; Slim/Tailored Fit &nbsp;|&nbsp; Budget: ~$2,000",
    subtitle_style
))
elements.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=14))

# ── T-SHIRTS ──────────────────────────────────────────────────────────────────
elements.append(Paragraph("T-Shirts", section_style))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Buck Mason", "Pima Curved Hem Tee", "$48", "Longer curved hem prevents riding up on tall torsos; slim chest; White, Black, Navy, Sand, Olive"],
        ["Sunspel", "Classic Crew Neck T-Shirt", "$130", "Ultra-fine Sea Island long-staple cotton; slim silhouette; White, Navy, Black, Grey Melange"],
        ["Vince", "Pima Cotton Crew Neck T-Shirt", "$88", "Peruvian pima with luxurious drape; slim fit with long body; Optic White, Black, Ocean Glass"],
        ["Faherty", "Sunwashed Pocket Tee (Tall)", "$58", "One of few quality brands with a Tall cut; organic cotton; garment-washed; White, Washed Black, Navy"],
    ]
))
elements.append(Paragraph(
    "Recommended: 3–4 Buck Mason tees + 1 Sunspel + 1 Vince (~$315–$365 total)",
    note_style
))

# ── LINEN / COTTON BUTTON-DOWNS ───────────────────────────────────────────────
elements.append(Paragraph("Linen / Cotton Button-Down Shirts", section_style))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Reiss", "Holiday Slim Fit Linen Shirt (Short Sleeve)", "$145", "Explicitly slim fit; European proportions (longer body, narrower chest); White, Navy, Sage, Stone, Sky Blue"],
        ["Reiss", "Holiday Slim Fit Linen Shirt (Long Sleeve)", "$165", "Same slim cut in long sleeve; great for cooler evenings"],
        ["Faherty", "Short-Sleeve Palma Linen Shirt (Camp Collar)", "$168", "100% linen, garment-washed; resort aesthetic; Ivory, White, earth-tone stripes"],
        ["Norse Projects", "Anton / Carsten Linen Shirt (Long Sleeve)", "$185", "Scandinavian precision; slim with extra body length; Ecru, Navy, Slate Blue, Terra Cotta"],
    ]
))
elements.append(Paragraph(
    "Recommended: 1 Reiss SS ($145) + 1 Reiss LS ($165) + 1 Norse Projects ($185) = ~$495",
    note_style
))

# ── POLOS ─────────────────────────────────────────────────────────────────────
elements.append(Paragraph("Polo Shirts", section_style))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Sunspel", "Riviera Slim-Fit Cotton-Mesh Polo", "$140", "Ultra-fine cotton mesh; exceptionally breathable; labeled 'slim fit'; Navy, White, Deep Olive, Ecru"],
        ["Norse Projects", "Leif Cotton/Linen Polo", "$215", "Cotton-linen blend; elongated body suits long torso; two-button placket; Dark Navy, Rust, Sage Green"],
        ["Reiss", "Slim Fit Polo", "$135", "European proportions; longer body for tall men; Navy, Camel, White, Sage, Stone"],
        ["Todd Snyder", "Short-Sleeve Polo (Japanese Cotton / Pique)", "$175", "Slim American-athletic silhouette; notably longer body; various seasonal colors"],
    ]
))
elements.append(Paragraph(
    "Recommended: 1 Sunspel Riviera ($140) + 1 Norse Projects Leif ($215) = ~$355",
    note_style
))

# ── SHORTS ────────────────────────────────────────────────────────────────────
elements.append(Paragraph("Shorts", section_style))
elements.append(Paragraph("<b>Chino Shorts</b>", ParagraphStyle(
    "SubHead", parent=styles["Normal"], fontSize=10, textColor=DARK,
    fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=5,
)))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Bonobos", "Italian Stretch Chino Shorts", "$138", "Slim fit; curved waistband prevents gaping on slim hips; 7\" inseam; Khaki, Olive, Navy, Washed Stone"],
        ["Todd Snyder", "7\" Chino Hudson Short", "$148", "Clean, elevated chino; 100% cotton; 7\" inseam; White, Khaki, Navy, Olive"],
        ["Buck Mason", "6\" Deck Short (hybrid)", "$98", "4-way stretch; DWR water-repellent; works as chino or swim short; Faded Khaki, Black, Sea Blue"],
    ]
))
elements.append(Spacer(1, 6))
elements.append(Paragraph("<b>Swim Trunks</b>", ParagraphStyle(
    "SubHead", parent=styles["Normal"], fontSize=10, textColor=DARK,
    fontName="Helvetica-Bold", spaceBefore=4, spaceAfter=5,
)))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Orlebar Brown", "Bulldog Mid-Length Swim Shorts", "$345", "Gold standard tailored swim short; side adjusters; hook-and-bar closure; 6\" inseam; Navy, Olive, Sky Blue"],
        ["Outerknown", "APEX Evolution Trunk (by Kelly Slater)", "$110", "Slim active cut; ECONYL recycled nylon; great for surfing/paddleboarding; Storm, Meadow Blue, Red Block"],
    ]
))
elements.append(Paragraph(
    "Recommended: 1 Bonobos ($138) + 1 Todd Snyder Hudson ($148) + 1 Outerknown trunk ($110) = ~$396  |  Premium upgrade: Orlebar Brown Bulldog ($345) replaces both",
    note_style
))

# ── PANTS ─────────────────────────────────────────────────────────────────────
elements.append(Paragraph("Pants / Chinos (Summer Weight)", section_style))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Theory", "Zaine Pant (Linen-Viscose Blend)", "$235", "Smartest summer trouser; slim but not skinny; airy and refined; Navy, Khaki, Stone, White, Light Grey"],
        ["Todd Snyder", "Slim Fit 5-Pocket Chino (Garment Dyed)", "$148", "Casual-dressy like a refined jean; slim fit; lightweight cotton; Black, Manor Grey, Olive, Khaki, Tan"],
        ["Banana Republic", "Aiden Slim Lightweight Chino", "$95", "Excellent value; notably long rise for tall men; Khaki, Navy, Olive, White, Stone"],
        ["J.Crew", "484 Slim-Fit Lightweight Garment-Dyed Stretch Chino", "$89", "Slim tapered cut; 33/32 readily stocked; Navy, Khaki, Vintage Olive, Chambray Blue, Cream"],
    ]
))
elements.append(Paragraph(
    "Recommended: 1 Theory Zaine ($235) + 1 Todd Snyder 5-Pocket ($148) = ~$383",
    note_style
))

# ── OUTERWEAR ─────────────────────────────────────────────────────────────────
elements.append(Paragraph("Lightweight Outerwear", section_style))
elements.append(make_table(
    ["Brand", "Product", "Price", "Notes"],
    [
        ["Todd Snyder", "Linen Chore Coat", "$398", "French chore-coat silhouette; garment-dyed linen; patch pockets; Navy or Black; great over a tee for elevated casual"],
        ["Todd Snyder", "Linen Harrington Jacket", "$398", "Tailored bomber-adjacent; slim fit; short length suits long torso; Bisque, Blue, Olive"],
        ["Outerknown", "ECONYL Evolution Shirt Jacket", "$160", "Packable, practical light layer; recycled nylon; budget-friendly option"],
    ]
))
elements.append(Paragraph(
    "Recommended: 1 Todd Snyder Linen Chore Coat ($398, or ~$175 on sale)",
    note_style
))

# ── FULL BUDGET TABLE ─────────────────────────────────────────────────────────
elements.append(Paragraph("Full Recommended Build & Budget", section_style))
elements.append(make_table(
    ["Category", "Brand & Item", "Price"],
    [
        ["T-Shirts (x4)", "Buck Mason Pima Curved Hem Tee", "$192"],
        ["T-Shirt", "Sunspel Classic Crew Neck", "$130"],
        ["T-Shirt", "Vince Pima Crew Neck", "$88"],
        ["Linen Shirt SS", "Reiss Holiday Slim Fit", "$145"],
        ["Linen Shirt LS", "Reiss Holiday Slim Fit", "$165"],
        ["Linen/Cotton Shirt", "Norse Projects Anton/Carsten", "$185"],
        ["Polo", "Sunspel Riviera Cotton-Mesh", "$140"],
        ["Polo", "Norse Projects Leif Cotton/Linen", "$215"],
        ["Chino Short", "Bonobos Italian Stretch", "$138"],
        ["Swim Trunk", "Outerknown APEX Evolution", "$110"],
        ["Summer Chino", "Theory Zaine Linen-Viscose", "$235"],
        ["5-Pocket Pant", "Todd Snyder Garment-Dyed", "$148"],
        ["Outerwear", "Todd Snyder Linen Chore Coat", "$398"],
        ["TOTAL", "", "~$2,289"],
    ]
))
elements.append(Paragraph(
    "To stay under $2,000: swap Theory Zaine ($235) for J.Crew 484 ($89) to save $146, "
    "and/or catch the Todd Snyder Chore Coat on sale (~$175, saving ~$225).",
    note_style
))

# ── FIT NOTES ─────────────────────────────────────────────────────────────────
elements.append(Paragraph("Fit Notes for 6'3\" / 195 lbs", section_style))
fit_notes = [
    "<b>Shirt size Large</b> runs true at Buck Mason, Vince, Sunspel, and Reiss. Norse Projects fits slightly slim — size up to XL if you have broad shoulders.",
    "<b>33/32 pants</b> are well-stocked online at Theory, Todd Snyder, Bonobos, and J.Crew. Bonobos lets you freely mix waist and inseam sizes — safest bet for exact fit.",
    "The biggest challenge at 6'3\" is <b>torso length in t-shirts</b> — Buck Mason's curved hem and Faherty's dedicated Tall sizing directly address this.",
    "Avoid relaxed-fit or 'regular' cuts entirely — at your proportions, slim and tailored fits read as intentional; relaxed fits read as ill-fitting.",
    "<b>Inseam for shorts:</b> A 7\" inseam hits mid-thigh cleanly on long legs. A 5\" inseam can look too short; a 9\" can drag toward the knee.",
]
for note in fit_notes:
    elements.append(Paragraph(f"• {note}", fit_bullet_style))

elements.append(Spacer(1, 20))
elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=8))
elements.append(Paragraph(
    "Report generated May 2026 &nbsp;|&nbsp; Prices are current retail USD and subject to change.",
    ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=MID,
                   fontName="Helvetica-Oblique", alignment=TA_CENTER)
))

doc.build(elements)
print(f"PDF written to {OUTPUT}")
