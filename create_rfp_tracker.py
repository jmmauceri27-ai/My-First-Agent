#!/usr/bin/env python3
"""Generate an RFP Bid Tracker Excel workbook.

Usage:
    python create_rfp_tracker.py [output_path]

Produces a formatted .xlsx with a tracker sheet (client, site count, site
area, due dates, status, value, etc.) plus a dashboard sheet that summarizes
pipeline by status.
"""
import sys
from pathlib import Path

import xlsxwriter

COLUMNS = [
    ("RFP ID", 10),
    ("Client Name", 24),
    ("Project Name", 28),
    ("Site Count", 11),
    ("Total Site Area (sq ft)", 20),
    ("Service Type", 18),
    ("Region", 16),
    ("RFP Issued Date", 15),
    ("Due Date", 13),
    ("Days Until Due", 14),
    ("Status", 14),
    ("Est. Contract Value", 18),
    ("Win Probability", 14),
    ("Assigned To", 16),
    ("Contact Name", 18),
    ("Contact Email", 26),
    ("Submission Method", 18),
    ("Notes", 30),
]

STATUS_OPTIONS = [
    "Not Started",
    "In Progress",
    "Submitted",
    "Awarded",
    "Lost",
    "Declined",
    "On Hold",
]

SAMPLE_ROWS = [
    [
        "RFP-001", "Acme Retail Corp", "Multi-Site Janitorial Services", 12, 185000,
        "Janitorial", "Northeast", "2026-06-15", "2026-07-31", None,
        "In Progress", 240000, 0.5, "J. Mauceri", "Sam Rivera",
        "sam.rivera@acmeretail.com", "Online Portal", "Walkthrough scheduled 7/10",
    ],
    [
        "RFP-002", "Meridian Property Group", "Landscaping & Grounds Maintenance", 6, 92000,
        "Landscaping", "Southeast", "2026-06-20", "2026-07-15", None,
        "Submitted", 118000, 0.3, "J. Mauceri", "Dana Kim",
        "dkim@meridianpg.com", "Email", "Awaiting client Q&A response",
    ],
    [
        "RFP-003", "Union Logistics", "Snow & Ice Management", 24, 410000,
        "Snow Removal", "Midwest", "2026-06-01", "2026-07-08", None,
        "Not Started", 350000, 0.2, "", "", "", "", "Need to confirm site list",
    ],
]

STATUS_COLORS = {
    "Awarded": "#C6EFCE",
    "Lost": "#F2F2F2",
    "Declined": "#F2F2F2",
    "Submitted": "#DDEBF7",
    "In Progress": "#FFF2CC",
    "Not Started": "#FFFFFF",
    "On Hold": "#FCE4D6",
}


def build_tracker(output_path: str) -> str:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    workbook = xlsxwriter.Workbook(str(out))
    sheet = workbook.add_worksheet("RFP Tracker")
    dashboard = workbook.add_worksheet("Dashboard")

    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#1F4E79", "font_color": "#FFFFFF",
        "border": 1, "align": "center", "valign": "vcenter", "text_wrap": True,
    })
    date_fmt = workbook.add_format({"num_format": "yyyy-mm-dd"})
    money_fmt = workbook.add_format({"num_format": "$#,##0"})
    pct_fmt = workbook.add_format({"num_format": "0%"})
    int_fmt = workbook.add_format({"num_format": "#,##0"})
    wrap_fmt = workbook.add_format({"text_wrap": True, "valign": "top"})

    n_cols = len(COLUMNS)
    n_rows = 200

    for col_idx, (name, width) in enumerate(COLUMNS):
        sheet.write(0, col_idx, name, header_fmt)
        sheet.set_column(col_idx, col_idx, width)
    sheet.set_row(0, 32)
    sheet.freeze_panes(1, 2)

    col_idx = {name: i for i, (name, _) in enumerate(COLUMNS)}

    for r, row in enumerate(SAMPLE_ROWS, start=1):
        for c, value in enumerate(row):
            name = COLUMNS[c][0]
            if name in ("RFP Issued Date", "Due Date") and value:
                sheet.write_datetime(r, c, __import__("datetime").datetime.strptime(value, "%Y-%m-%d"), date_fmt)
            elif name == "Days Until Due":
                due_cell = xlsxwriter.utility.xl_rowcol_to_cell(r, col_idx["Due Date"])
                sheet.write_formula(r, c, f'=IF({due_cell}="","",{due_cell}-TODAY())', int_fmt)
            elif name in ("Site Count",):
                sheet.write_number(r, c, value, int_fmt)
            elif name == "Total Site Area (sq ft)":
                sheet.write_number(r, c, value, int_fmt)
            elif name == "Est. Contract Value":
                sheet.write_number(r, c, value, money_fmt)
            elif name == "Win Probability":
                sheet.write_number(r, c, value, pct_fmt)
            elif name == "Notes":
                sheet.write(r, c, value, wrap_fmt)
            else:
                sheet.write(r, c, value)

    # Blank formula rows below the samples so Days Until Due auto-fills as rows are used.
    for r in range(len(SAMPLE_ROWS) + 1, n_rows):
        due_cell = xlsxwriter.utility.xl_rowcol_to_cell(r, col_idx["Due Date"])
        sheet.write_formula(r, col_idx["Days Until Due"], f'=IF({due_cell}="","",{due_cell}-TODAY())', int_fmt)

    # Status dropdown validation
    sheet.data_validation(
        1, col_idx["Status"], n_rows - 1, col_idx["Status"],
        {"validate": "list", "source": STATUS_OPTIONS},
    )

    # Conditional formatting by status
    status_col = col_idx["Status"]
    status_range = xlsxwriter.utility.xl_range(1, status_col, n_rows - 1, status_col)
    for status, color in STATUS_COLORS.items():
        if color == "#FFFFFF":
            continue
        fmt = workbook.add_format({"bg_color": color})
        sheet.conditional_format(status_range, {
            "type": "cell", "criteria": "equal to", "value": f'"{status}"', "format": fmt,
        })

    # Highlight due dates that are close or overdue
    due_col = col_idx["Due Date"]
    due_range = xlsxwriter.utility.xl_range(1, due_col, n_rows - 1, due_col)
    overdue_fmt = workbook.add_format({"bg_color": "#FFC7CE", "font_color": "#9C0006"})
    soon_fmt = workbook.add_format({"bg_color": "#FFEB9C", "font_color": "#9C6500"})
    due_cell_ref = xlsxwriter.utility.xl_rowcol_to_cell(1, due_col)
    sheet.conditional_format(due_range, {
        "type": "formula",
        "criteria": f'=AND({due_cell_ref}<>"",{due_cell_ref}<TODAY())',
        "format": overdue_fmt,
    })
    sheet.conditional_format(due_range, {
        "type": "formula",
        "criteria": f'=AND({due_cell_ref}<>"",{due_cell_ref}>=TODAY(),{due_cell_ref}<=TODAY()+7)',
        "format": soon_fmt,
    })

    sheet.autofilter(0, 0, n_rows - 1, n_cols - 1)

    # --- Dashboard sheet ---
    dash_header = workbook.add_format({
        "bold": True, "bg_color": "#1F4E79", "font_color": "#FFFFFF", "border": 1,
    })
    dash_title = workbook.add_format({"bold": True, "font_size": 14})
    dashboard.write(0, 0, "RFP Pipeline Dashboard", dash_title)
    dashboard.set_column(0, 0, 26)
    dashboard.set_column(1, 1, 16)

    data_range = f"'RFP Tracker'!${xlsxwriter.utility.xl_col_to_name(status_col)}$2:${xlsxwriter.utility.xl_col_to_name(status_col)}${n_rows}"
    value_col_letter = xlsxwriter.utility.xl_col_to_name(col_idx["Est. Contract Value"])
    value_range = f"'RFP Tracker'!${value_col_letter}$2:${value_col_letter}${n_rows}"

    dashboard.write(2, 0, "Status", dash_header)
    dashboard.write(2, 1, "Count", dash_header)
    for i, status in enumerate(STATUS_OPTIONS, start=3):
        dashboard.write(i, 0, status)
        dashboard.write_formula(i, 1, f'=COUNTIF({data_range},"{status}")')

    total_row = 3 + len(STATUS_OPTIONS) + 1
    dashboard.write(total_row, 0, "Total RFPs", dash_header)
    dashboard.write_formula(total_row, 1, f'=COUNTA({data_range})-COUNTIF({data_range},"")')

    pipeline_row = total_row + 2
    dashboard.write(pipeline_row, 0, "Total Est. Pipeline Value", dash_header)
    dashboard.write_formula(pipeline_row, 1, f'=SUM({value_range})', money_fmt)

    open_value_row = pipeline_row + 1
    dashboard.write(open_value_row, 0, "Open Pipeline (excl. Lost/Declined/Awarded)", dash_header)
    dashboard.write_formula(
        open_value_row, 1,
        f'=SUMIFS({value_range},{data_range},"<>Lost",{data_range},"<>Declined",{data_range},"<>Awarded")',
        money_fmt,
    )

    win_rate_row = open_value_row + 2
    dashboard.write(win_rate_row, 0, "Win Rate (Awarded / (Awarded+Lost))", dash_header)
    dashboard.write_formula(
        win_rate_row, 1,
        f'=IFERROR(COUNTIF({data_range},"Awarded")/(COUNTIF({data_range},"Awarded")+COUNTIF({data_range},"Lost")),0)',
        pct_fmt,
    )

    workbook.close()
    return str(out)


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "outputs/RFP_Bid_Tracker.xlsx"
    path = build_tracker(output)
    print(f"RFP Bid Tracker created: {path}")
