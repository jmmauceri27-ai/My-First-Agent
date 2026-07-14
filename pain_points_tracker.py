#!/usr/bin/env python3
"""Interactive CLI for logging UtilizeCore pain points and generating
presentation-ready reports (Excel + Markdown) to share with the company."""
import sys
from pathlib import Path
from datetime import datetime

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich.text import Text

import pain_points_store as store

console = Console()
_output_dir = Path("outputs")

SEVERITY_STYLE = {
    "Low": "green",
    "Medium": "yellow",
    "High": "orange3",
    "Critical": "bold red",
}
STATUS_STYLE = {
    "Open": "red",
    "In Progress": "yellow",
    "Resolved": "green",
    "Won't Fix": "dim",
}


def _choose(label: str, options: list[str], default: str = None) -> str:
    console.print(f"\n[bold]{label}[/bold]")
    for i, opt in enumerate(options, 1):
        console.print(f"  {i}. {opt}")
    default_idx = str(options.index(default) + 1) if default in options else "1"
    choice = Prompt.ask("Select a number", default=default_idx)
    try:
        idx = int(choice) - 1
        if 0 <= idx < len(options):
            return options[idx]
    except ValueError:
        pass
    return options[0]


def cmd_add():
    console.print(Panel("Log a new pain point", border_style="cyan"))
    title = Prompt.ask("Title (short summary)").strip()
    if not title:
        console.print("[red]Title is required. Cancelled.[/red]")
        return
    category = _choose("Category", store.CATEGORIES)
    description = Prompt.ask("Description (what happened, steps to reproduce, etc.)").strip()
    impact = Prompt.ask("Business impact (time lost, cost, blocked work, etc.)", default="").strip()
    severity = _choose("Severity", store.SEVERITIES, default="Medium")
    frequency = _choose("How often does this happen?", store.FREQUENCIES, default="Occasional")
    workaround = Prompt.ask("Workaround in use, if any (optional)", default="").strip()

    record_id = store.add_pain_point(
        title=title,
        category=category,
        description=description,
        severity=severity,
        frequency=frequency,
        impact=impact,
        workaround=workaround,
    )
    console.print(f"\n[green]Saved pain point [{record_id}]: {title}[/green]")


def _render_table(rows: list[dict]):
    if not rows:
        console.print("[yellow]No pain points logged yet.[/yellow]")
        return
    table = Table(title=f"Pain Points ({len(rows)})", show_lines=False)
    table.add_column("ID", style="dim")
    table.add_column("Title")
    table.add_column("Category")
    table.add_column("Severity")
    table.add_column("Frequency")
    table.add_column("Status")
    table.add_column("Logged")
    for r in rows:
        table.add_row(
            r["id"],
            r["title"],
            r["category"],
            Text(r["severity"], style=SEVERITY_STYLE.get(r["severity"], "")),
            r["frequency"],
            Text(r["status"], style=STATUS_STYLE.get(r["status"], "")),
            r["date_logged"][:10],
        )
    console.print(table)


def cmd_list():
    status_filter = Prompt.ask(
        "Filter by status? (Open/In Progress/Resolved/Won't Fix, blank for all)", default=""
    ).strip()
    rows = store.list_pain_points(status=status_filter or None)
    _render_table(rows)


def cmd_show():
    record_id = Prompt.ask("Pain point ID").strip()
    r = store.get_pain_point(record_id)
    if not r:
        console.print(f"[red]No pain point found with ID '{record_id}'.[/red]")
        return
    body = (
        f"[bold]{r['title']}[/bold]\n"
        f"Category: {r['category']}   Severity: {r['severity']}   Frequency: {r['frequency']}\n"
        f"Status: {r['status']}   Logged: {r['date_logged'][:19]}\n\n"
        f"[bold]Description:[/bold] {r['description']}\n\n"
        f"[bold]Business impact:[/bold] {r['impact'] or '(none noted)'}\n\n"
        f"[bold]Workaround:[/bold] {r['workaround'] or '(none)'}"
    )
    console.print(Panel(body, title=f"[{r['id']}]", border_style="cyan"))


def cmd_update_status():
    record_id = Prompt.ask("Pain point ID").strip()
    r = store.get_pain_point(record_id)
    if not r:
        console.print(f"[red]No pain point found with ID '{record_id}'.[/red]")
        return
    new_status = _choose("New status", store.STATUSES, default=r["status"])
    store.update_status(record_id, new_status)
    console.print(f"[green]Updated [{record_id}] to status '{new_status}'.[/green]")


def cmd_edit():
    record_id = Prompt.ask("Pain point ID to edit").strip()
    r = store.get_pain_point(record_id)
    if not r:
        console.print(f"[red]No pain point found with ID '{record_id}'.[/red]")
        return
    console.print(f"Editing [{record_id}] {r['title']} — press Enter to keep the current value.")
    title = Prompt.ask("Title", default=r["title"])
    category = Prompt.ask("Category", default=r["category"])
    description = Prompt.ask("Description", default=r["description"])
    impact = Prompt.ask("Business impact", default=r["impact"] or "")
    severity = _choose("Severity", store.SEVERITIES, default=r["severity"])
    frequency = _choose("Frequency", store.FREQUENCIES, default=r["frequency"])
    workaround = Prompt.ask("Workaround", default=r["workaround"] or "")

    store.update_pain_point(
        record_id,
        title=title,
        category=category,
        description=description,
        impact=impact,
        severity=severity,
        frequency=frequency,
        workaround=workaround,
    )
    console.print(f"[green]Updated [{record_id}].[/green]")


def cmd_delete():
    record_id = Prompt.ask("Pain point ID to delete").strip()
    r = store.get_pain_point(record_id)
    if not r:
        console.print(f"[red]No pain point found with ID '{record_id}'.[/red]")
        return
    if Confirm.ask(f"Delete '{r['title']}' [{record_id}]?", default=False):
        store.delete_pain_point(record_id)
        console.print("[green]Deleted.[/green]")


def cmd_stats():
    stats = store.get_stats()
    lines = [f"Total pain points logged: {stats['total']}\n"]
    for label, counts in (
        ("By status", stats["by_status"]),
        ("By severity", stats["by_severity"]),
        ("By category", stats["by_category"]),
    ):
        lines.append(f"[bold]{label}:[/bold]")
        for k, v in sorted(counts.items(), key=lambda x: -x[1]):
            lines.append(f"  {k}: {v}")
        lines.append("")
    console.print(Panel("\n".join(lines), title="Summary Stats", border_style="magenta"))


def _ensure_output_dir():
    _output_dir.mkdir(parents=True, exist_ok=True)


def _generate_markdown_report(rows: list[dict], stats: dict) -> Path:
    _ensure_output_dir()
    out_path = _output_dir / "pain_points_report.md"
    lines = [
        "# UtilizeCore Pain Points Report",
        f"_Generated {datetime.now().strftime('%Y-%m-%d')}_",
        "",
        "## Summary",
        f"- Total issues logged: {stats['total']}",
    ]
    for k, v in sorted(stats["by_severity"].items(), key=lambda x: -x[1]):
        lines.append(f"- {k} severity: {v}")
    lines.append("")

    by_category: dict[str, list[dict]] = {}
    for r in rows:
        by_category.setdefault(r["category"], []).append(r)

    for category in sorted(by_category, key=lambda c: -len(by_category[c])):
        cat_rows = by_category[category]
        lines.append(f"## {category} ({len(cat_rows)})")
        lines.append("")
        for r in cat_rows:
            lines.append(f"### {r['title']} `[{r['id']}]`")
            lines.append(
                f"**Severity:** {r['severity']} &nbsp;|&nbsp; "
                f"**Frequency:** {r['frequency']} &nbsp;|&nbsp; "
                f"**Status:** {r['status']} &nbsp;|&nbsp; "
                f"**Logged:** {r['date_logged'][:10]}"
            )
            lines.append("")
            lines.append(f"**What's happening:** {r['description']}")
            if r["impact"]:
                lines.append("")
                lines.append(f"**Business impact:** {r['impact']}")
            if r["workaround"]:
                lines.append("")
                lines.append(f"**Current workaround:** {r['workaround']}")
            lines.append("")
        lines.append("")

    out_path.write_text("\n".join(lines))
    return out_path


def _generate_excel_report(rows: list[dict], stats: dict) -> Path:
    import pandas as pd

    _ensure_output_dir()
    out_path = _output_dir / "pain_points_report.xlsx"

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df[[
            "id", "title", "category", "severity", "frequency", "status",
            "impact", "workaround", "description", "date_logged", "date_resolved",
        ]]
        df.columns = [
            "ID", "Title", "Category", "Severity", "Frequency", "Status",
            "Business Impact", "Workaround", "Description", "Date Logged", "Date Resolved",
        ]

    with pd.ExcelWriter(out_path, engine="xlsxwriter") as writer:
        df.to_excel(writer, sheet_name="Pain Points", index=False)
        workbook = writer.book
        worksheet = writer.sheets["Pain Points"]
        header_fmt = workbook.add_format({
            "bold": True, "bg_color": "#1F4E79", "font_color": "#FFFFFF",
            "border": 1, "align": "center",
        })
        for col_num, col_name in enumerate(df.columns):
            worksheet.write(0, col_num, col_name, header_fmt)
            max_len = max(
                len(str(col_name)),
                df[col_name].astype(str).str.len().max() if not df.empty else 0,
            )
            worksheet.set_column(col_num, col_num, min(max_len + 2, 50))

        summary_rows = [["Total Issues", stats["total"]]]
        for group_label, group in (
            ("By Severity", stats["by_severity"]),
            ("By Status", stats["by_status"]),
            ("By Category", stats["by_category"]),
        ):
            summary_rows.append(["", ""])
            summary_rows.append([group_label, ""])
            for k, v in sorted(group.items(), key=lambda x: -x[1]):
                summary_rows.append([f"  {k}", v])
        summary_df = pd.DataFrame(summary_rows, columns=["Metric", "Value"])
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        ws_sum = writer.sheets["Summary"]
        for col_num, col_name in enumerate(summary_df.columns):
            ws_sum.write(0, col_num, col_name, header_fmt)
        ws_sum.set_column(0, 0, 30)
        ws_sum.set_column(1, 1, 15)

    return out_path


def cmd_report():
    rows = store.list_pain_points()
    if not rows:
        console.print("[yellow]No pain points logged yet — nothing to report.[/yellow]")
        return
    stats = store.get_stats()
    md_path = _generate_markdown_report(rows, stats)
    xlsx_path = _generate_excel_report(rows, stats)
    console.print(Panel(
        f"[green]Report generated:[/green]\n"
        f"  • {md_path}  (readable summary, good for email/docs)\n"
        f"  • {xlsx_path}  (spreadsheet with a Summary tab)",
        title="Report Ready to Present",
        border_style="green",
    ))


HELP_TEXT = (
    "• add        - log a new pain point\n"
    "• list       - view all logged pain points (optionally filter by status)\n"
    "• show       - view full details of one pain point by ID\n"
    "• edit       - edit any field of a pain point\n"
    "• status     - update the status of a pain point\n"
    "• delete     - remove a pain point\n"
    "• stats      - summary counts by status/severity/category\n"
    "• report     - generate a Markdown + Excel report for presenting to UtilizeCore\n"
    "• help       - show this help\n"
    "• quit       - exit"
)

COMMANDS = {
    "add": cmd_add,
    "list": cmd_list,
    "show": cmd_show,
    "edit": cmd_edit,
    "status": cmd_update_status,
    "delete": cmd_delete,
    "stats": cmd_stats,
    "report": cmd_report,
}


def main():
    console.print(Panel(
        Text.from_markup(
            "[bold blue]UtilizeCore Pain Points Tracker[/bold blue]\n\n"
            "Log issues as you hit them, keep a running record, and generate a "
            "report to share with UtilizeCore.\n\n"
            f"[dim]{HELP_TEXT}[/dim]"
        ),
        title="Welcome",
        border_style="blue",
    ))

    while True:
        try:
            cmd = Prompt.ask("\n[bold cyan]pain-points>[/bold cyan]").strip().lower()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[yellow]Goodbye![/yellow]")
            break

        if not cmd:
            continue
        if cmd in ("quit", "exit", "q"):
            console.print("[yellow]Goodbye![/yellow]")
            break
        if cmd == "help":
            console.print(Panel(HELP_TEXT, title="Help", border_style="cyan"))
            continue
        if cmd in COMMANDS:
            try:
                COMMANDS[cmd]()
            except (KeyboardInterrupt, EOFError):
                console.print("\n[yellow]Cancelled.[/yellow]")
            except Exception as e:
                console.print(f"[red]Unexpected error: {type(e).__name__}: {e}[/red]")
        else:
            console.print(f"[red]Unknown command '{cmd}'. Type 'help' for options.[/red]")


if __name__ == "__main__":
    sys.exit(main())
