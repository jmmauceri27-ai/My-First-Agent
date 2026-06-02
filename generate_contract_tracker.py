from openpyxl import Workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule
from datetime import date, timedelta
import calendar

wb = Workbook()

# ── Sheet 1: Gantt Timeline ──────────────────────────────────────────────────
ws = wb.active
ws.title = "Contract Timeline"

# Palette
COLOR_HEADER_BG   = "1F3864"   # dark navy
COLOR_HEADER_FG   = "FFFFFF"
COLOR_SUBHDR_BG   = "2E75B6"   # medium blue
COLOR_ROW_ALT     = "DCE6F1"   # light blue
COLOR_ROW_WHITE   = "FFFFFF"
COLOR_GANTT_BASE  = [           # one colour per client (cycles)
    "2E75B6", "70AD47", "ED7D31", "A9D18E",
    "9DC3E6", "FFD966", "FF7C80", "C5A3FF",
]
COLOR_TODAY       = "FF0000"
COLOR_BORDER      = "BDD7EE"

thin  = Side(style="thin",   color=COLOR_BORDER)
thick = Side(style="medium", color="1F3864")

def hdr_fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def cell_border(top=thin, bottom=thin, left=thin, right=thin):
    return Border(top=top, bottom=bottom, left=left, right=right)

# ── Sample data (replace with your real contracts) ───────────────────────────
contracts = [
    # (Client,             Trade/Service,       Start date,            End date)
    ("Acme Corp",          "Electrical",         date(2025, 1, 15),  date(2025, 12, 31)),
    ("Acme Corp",          "HVAC",               date(2025, 3,  1),  date(2026,  2, 28)),
    ("Blue Ridge LLC",     "Plumbing",           date(2025, 2,  1),  date(2025,  7, 31)),
    ("Blue Ridge LLC",     "General Contracting",date(2025, 6,  1),  date(2026,  5, 31)),
    ("Summit Partners",    "Roofing",            date(2025, 4,  1),  date(2025,  9, 30)),
    ("Summit Partners",    "Electrical",         date(2025, 9,  1),  date(2026,  8, 31)),
    ("Horizon Group",      "Landscaping",        date(2025, 1,  1),  date(2025, 12, 31)),
    ("Horizon Group",      "Painting",           date(2025, 5, 15),  date(2025, 11, 14)),
    ("Crestview Inc",      "Flooring",           date(2025, 7,  1),  date(2026,  6, 30)),
    ("Crestview Inc",      "HVAC",               date(2025, 10, 1),  date(2026,  3, 31)),
]

# Timeline span: derive from data
all_starts = [c[2] for c in contracts]
all_ends   = [c[3] for c in contracts]
tl_start   = date(min(all_starts).year, 1, 1)
tl_end     = date(max(all_ends).year, 12, 31)

# Build list of months in timeline
months = []
d = tl_start
while d <= tl_end:
    months.append((d.year, d.month))
    m = d.month + 1
    y = d.year + (1 if m > 12 else 0)
    m = 1 if m > 12 else m
    d = date(y, m, 1)

# Column layout
COL_CLIENT  = 1
COL_TRADE   = 2
COL_START   = 3
COL_END     = 4
COL_DURATION= 5
COL_GANTT_0 = 6   # first gantt column

# ── Set column widths ─────────────────────────────────────────────────────────
ws.column_dimensions[get_column_letter(COL_CLIENT)].width   = 20
ws.column_dimensions[get_column_letter(COL_TRADE)].width    = 22
ws.column_dimensions[get_column_letter(COL_START)].width    = 13
ws.column_dimensions[get_column_letter(COL_END)].width      = 13
ws.column_dimensions[get_column_letter(COL_DURATION)].width = 14
for i, (yr, mo) in enumerate(months):
    col = COL_GANTT_0 + i
    ws.column_dimensions[get_column_letter(col)].width = 4.5

# ── Row 1: main title ─────────────────────────────────────────────────────────
ws.row_dimensions[1].height = 28
ws.merge_cells(start_row=1, start_column=1,
               end_row=1,   end_column=COL_GANTT_0 + len(months) - 1)
title_cell = ws.cell(1, 1, "CONTRACT LENGTH TRACKER")
title_cell.font      = Font(name="Calibri", bold=True, size=16, color=COLOR_HEADER_FG)
title_cell.fill      = hdr_fill(COLOR_HEADER_BG)
title_cell.alignment = Alignment(horizontal="center", vertical="center")

# ── Row 2: year bands ─────────────────────────────────────────────────────────
ws.row_dimensions[2].height = 16
for label in ["Client", "Trade / Service", "Start Date", "End Date", "Duration"]:
    pass  # filled in row 3

years_seen = {}
for i, (yr, mo) in enumerate(months):
    if yr not in years_seen:
        years_seen[yr] = i
# Merge year cells
for yr, start_i in years_seen.items():
    end_i = start_i
    for j, (y, m) in enumerate(months):
        if y == yr:
            end_i = j
    c1 = COL_GANTT_0 + start_i
    c2 = COL_GANTT_0 + end_i
    ws.merge_cells(start_row=2, start_column=c1, end_row=2, end_column=c2)
    cell = ws.cell(2, c1, str(yr))
    cell.font      = Font(name="Calibri", bold=True, size=10, color=COLOR_HEADER_FG)
    cell.fill      = hdr_fill(COLOR_SUBHDR_BG)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border    = cell_border()

# fill empty cells in col 1-5 of row 2
for c in range(1, COL_GANTT_0):
    cell = ws.cell(2, c)
    cell.fill = hdr_fill(COLOR_HEADER_BG)

# ── Row 3: column headers + month abbreviations ───────────────────────────────
ws.row_dimensions[3].height = 20
header_labels = {
    COL_CLIENT:   "Client",
    COL_TRADE:    "Trade / Service",
    COL_START:    "Start Date",
    COL_END:      "End Date",
    COL_DURATION: "Duration (days)",
}
for col, label in header_labels.items():
    cell = ws.cell(3, col, label)
    cell.font      = Font(name="Calibri", bold=True, size=10, color=COLOR_HEADER_FG)
    cell.fill      = hdr_fill(COLOR_HEADER_BG)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border    = cell_border(top=thick, bottom=thick)

for i, (yr, mo) in enumerate(months):
    col  = COL_GANTT_0 + i
    cell = ws.cell(3, col, calendar.month_abbr[mo])
    cell.font      = Font(name="Calibri", bold=True, size=8, color=COLOR_HEADER_FG)
    cell.fill      = hdr_fill(COLOR_HEADER_BG)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border    = cell_border(top=thick, bottom=thick)

# ── Data rows ─────────────────────────────────────────────────────────────────
today = date.today()
client_color_map = {}
color_idx = 0

for row_idx, (client, trade, start, end) in enumerate(contracts):
    excel_row = 4 + row_idx
    ws.row_dimensions[excel_row].height = 18

    if client not in client_color_map:
        client_color_map[client] = COLOR_GANTT_BASE[color_idx % len(COLOR_GANTT_BASE)]
        color_idx += 1

    gantt_color = client_color_map[client]
    alt_fill    = hdr_fill(COLOR_ROW_ALT if row_idx % 2 == 0 else COLOR_ROW_WHITE)
    duration    = (end - start).days + 1

    # Info columns
    data = {
        COL_CLIENT:   client,
        COL_TRADE:    trade,
        COL_START:    start.strftime("%m/%d/%Y"),
        COL_END:      end.strftime("%m/%d/%Y"),
        COL_DURATION: duration,
    }
    for col, val in data.items():
        cell = ws.cell(excel_row, col, val)
        cell.fill      = alt_fill
        cell.font      = Font(name="Calibri", size=10)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = cell_border()
    # left-align client/trade
    ws.cell(excel_row, COL_CLIENT).alignment  = Alignment(horizontal="left",  vertical="center", indent=1)
    ws.cell(excel_row, COL_TRADE).alignment   = Alignment(horizontal="left",  vertical="center", indent=1)

    # Gantt bars
    for i, (yr, mo) in enumerate(months):
        col         = COL_GANTT_0 + i
        month_start = date(yr, mo, 1)
        month_end   = date(yr, mo, calendar.monthrange(yr, mo)[1])
        cell        = ws.cell(excel_row, col, "")
        cell.border = cell_border()

        overlap = (start <= month_end) and (end >= month_start)
        if overlap:
            cell.fill = hdr_fill(gantt_color)
        else:
            cell.fill = alt_fill

        # today marker
        if month_start <= today <= month_end:
            cell.border = Border(
                top=thin, bottom=thin,
                left=Side(style="medium", color=COLOR_TODAY),
                right=Side(style="medium", color=COLOR_TODAY),
            )

# ── Today line label in row 3 ─────────────────────────────────────────────────
for i, (yr, mo) in enumerate(months):
    month_start = date(yr, mo, 1)
    month_end   = date(yr, mo, calendar.monthrange(yr, mo)[1])
    if month_start <= today <= month_end:
        col  = COL_GANTT_0 + i
        cell = ws.cell(3, col)
        cell.font   = Font(name="Calibri", bold=True, size=8, color=COLOR_TODAY)
        cell.border = Border(
            top=thick, bottom=thick,
            left=Side(style="medium", color=COLOR_TODAY),
            right=Side(style="medium", color=COLOR_TODAY),
        )

# ── Legend (below data) ───────────────────────────────────────────────────────
legend_row = 4 + len(contracts) + 2
ws.cell(legend_row, 1, "LEGEND").font = Font(bold=True, size=10, color=COLOR_HEADER_FG)
ws.cell(legend_row, 1).fill = hdr_fill(COLOR_HEADER_BG)
ws.cell(legend_row, 1).alignment = Alignment(horizontal="center", vertical="center")

for li, (client, clr) in enumerate(client_color_map.items()):
    r = legend_row + 1 + li
    ws.cell(r, 1, "").fill = hdr_fill(clr)
    ws.cell(r, 2, client).font = Font(size=10)
    ws.cell(r, 2).alignment = Alignment(vertical="center", indent=1)

today_row = legend_row + 1 + len(client_color_map)
ws.cell(today_row, 1, "").border = Border(
    left=Side(style="medium", color=COLOR_TODAY),
    right=Side(style="medium", color=COLOR_TODAY),
)
ws.cell(today_row, 2, "Today").font = Font(size=10, color=COLOR_TODAY, bold=True)

# ── Freeze panes ─────────────────────────────────────────────────────────────
ws.freeze_panes = ws.cell(4, COL_GANTT_0)

# ── Sheet 2: Contract Data Entry ──────────────────────────────────────────────
ws2 = wb.create_sheet("Contract Data")
ws2.sheet_view.showGridLines = True

headers2 = ["#", "Client", "Trade / Service", "Contract #",
            "Start Date", "End Date", "Duration (days)",
            "Auto-Renew?", "Notice Period (days)", "Value ($)", "Notes"]
col_widths2 = [5, 22, 22, 16, 13, 13, 16, 12, 20, 14, 30]

ws2.row_dimensions[1].height = 28
ws2.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers2))
t2 = ws2.cell(1, 1, "CONTRACT MASTER LIST")
t2.font      = Font(name="Calibri", bold=True, size=14, color=COLOR_HEADER_FG)
t2.fill      = hdr_fill(COLOR_HEADER_BG)
t2.alignment = Alignment(horizontal="center", vertical="center")

ws2.row_dimensions[2].height = 20
for ci, (h, w) in enumerate(zip(headers2, col_widths2), start=1):
    ws2.column_dimensions[get_column_letter(ci)].width = w
    cell = ws2.cell(2, ci, h)
    cell.font      = Font(name="Calibri", bold=True, size=10, color=COLOR_HEADER_FG)
    cell.fill      = hdr_fill(COLOR_SUBHDR_BG)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border    = cell_border(top=thick, bottom=thick)

# Populate sample rows in sheet 2
for row_idx, (client, trade, start, end) in enumerate(contracts, start=1):
    r   = row_idx + 2
    dur = (end - start).days + 1
    row_fill = hdr_fill(COLOR_ROW_ALT if row_idx % 2 == 0 else COLOR_ROW_WHITE)
    vals = [row_idx, client, trade, f"CTR-{row_idx:03d}",
            start.strftime("%m/%d/%Y"), end.strftime("%m/%d/%Y"), dur,
            "No", 30, "", ""]
    for ci, val in enumerate(vals, start=1):
        cell = ws2.cell(r, ci, val)
        cell.fill      = row_fill
        cell.font      = Font(name="Calibri", size=10)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = cell_border()
    ws2.cell(r, 2).alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws2.cell(r, 3).alignment = Alignment(horizontal="left", vertical="center", indent=1)

ws2.freeze_panes = ws2["A3"]

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = "/home/user/My-First-Agent/Contract_Tracker.xlsx"
wb.save(out_path)
print(f"Saved: {out_path}")
