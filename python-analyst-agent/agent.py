#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

import anthropic
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text

import data_tools
from memory_store import save_insight, recall_memory

console = Console()

SYSTEM_PROMPT = """You are an expert data analyst specializing in UtilizeCore work order management data.

UtilizeCore data typically contains:
- Work orders: IDs, status, priority, type, description, creation/completion dates
- Vendors: vendor names, IDs, trade types, performance ratings
- Costs: labor costs, material costs, total costs, budget vs actual
- Locations/Properties: building names, addresses, regions, property types
- Response times: time to assign, time to start, time to complete
- Completion rates: open, in-progress, completed, cancelled statuses
- SLA compliance: whether work was completed within target timeframes

When analyzing data:
1. Always start by understanding the dataset structure before diving into analysis
2. Look for patterns in completion rates, vendor performance, cost trends, and response times
3. Identify outliers and anomalies that might indicate problems
4. Group analysis by meaningful dimensions: property, vendor, priority, time period
5. When creating visualizations, choose the chart type that best communicates the insight
6. Save important findings using save_insight so they persist across sessions
7. When exporting Excel files, apply meaningful filters and include summary sheets

You have access to tools to:
- Load Excel/CSV files from UtilizeCore exports
- Describe and statistically analyze the data
- Run custom pandas analysis code
- Create charts and visualizations
- Export results to formatted Excel files
- Save and recall insights across sessions

Always explain your analysis in plain business terms and highlight actionable insights.
Format numbers clearly (e.g., costs as currency, percentages for rates).
"""

TOOLS = [
    {
        "name": "load_file",
        "description": "Load an Excel (.xlsx, .xls) or CSV file into memory for analysis. Returns metadata including shape, columns, data types, and a preview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file to load (absolute or relative to current directory)",
                }
            },
            "required": ["path"],
        },
    },
    {
        "name": "describe_data",
        "description": "Get statistical descriptions of a loaded dataset. Shows numeric summaries (mean, std, min/max, percentiles) and top values for categorical columns.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {
                    "type": "string",
                    "description": "The dataset ID returned by load_file",
                },
                "columns": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of specific columns to describe. If omitted, all columns are described.",
                },
            },
            "required": ["dataset_id"],
        },
    },
    {
        "name": "run_analysis",
        "description": "Execute custom Python/pandas code on a dataset. The variable 'df' contains the DataFrame. Use print() to output results. Modifications to df are persisted back to the dataset.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {
                    "type": "string",
                    "description": "The dataset ID to analyze",
                },
                "code": {
                    "type": "string",
                    "description": "Python code to execute. 'df', 'pd' (pandas), and 'np' (numpy) are available. Use print() to show results.",
                },
            },
            "required": ["dataset_id", "code"],
        },
    },
    {
        "name": "create_visualization",
        "description": "Create and save a chart visualization. Returns the path to the saved PNG image.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {"type": "string", "description": "The dataset ID to visualize"},
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "scatter", "histogram", "heatmap", "box", "pie"],
                    "description": "Type of chart: bar (grouped counts/sums), line (trends over time), scatter (correlations), histogram (distribution), heatmap (correlation matrix), box (distribution by category), pie (proportions)",
                },
                "title": {"type": "string", "description": "Chart title"},
                "x_column": {"type": "string", "description": "Column for x-axis (or categories for pie)"},
                "y_column": {"type": "string", "description": "Column for y-axis or value"},
                "hue_column": {"type": "string", "description": "Optional column for color grouping"},
                "filename": {"type": "string", "description": "Optional output filename (default: derived from title)"},
            },
            "required": ["dataset_id", "chart_type", "title"],
        },
    },
    {
        "name": "export_to_excel",
        "description": "Export a dataset to a formatted Excel file with styled headers, auto-sized columns, and an optional summary sheet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {"type": "string", "description": "The dataset ID to export"},
                "filename": {"type": "string", "description": "Output filename (without path, .xlsx will be added if missing)"},
                "include_summary": {
                    "type": "boolean",
                    "description": "Whether to include a summary statistics sheet (default: true)",
                },
                "filters": {
                    "type": "string",
                    "description": "Optional pandas query string to filter rows before export, e.g. \"status == 'Completed'\" or \"cost > 1000\"",
                },
            },
            "required": ["dataset_id", "filename"],
        },
    },
    {
        "name": "list_datasets",
        "description": "List all currently loaded datasets with their shapes and column names.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "save_insight",
        "description": "Save an important finding or insight to persistent memory for future sessions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short descriptive title for the insight"},
                "content": {"type": "string", "description": "Detailed description of the finding"},
                "dataset_name": {"type": "string", "description": "Optional name of the dataset this insight came from"},
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional tags for categorization (e.g. ['vendor', 'performance', 'Q1-2024'])",
                },
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "recall_memory",
        "description": "Retrieve previously saved insights and analysis findings from persistent memory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Optional search term to filter memories. If omitted, returns the most recent insights.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of memories to return (default: 10)",
                },
            },
            "required": [],
        },
    },
]


def execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "load_file":
        return data_tools.load_file(**tool_input)
    elif tool_name == "describe_data":
        return data_tools.describe_data(**tool_input)
    elif tool_name == "run_analysis":
        return data_tools.run_analysis(**tool_input)
    elif tool_name == "create_visualization":
        return data_tools.create_visualization(**tool_input)
    elif tool_name == "export_to_excel":
        return data_tools.export_to_excel(**tool_input)
    elif tool_name == "list_datasets":
        return data_tools.list_datasets()
    elif tool_name == "save_insight":
        return save_insight(**tool_input)
    elif tool_name == "recall_memory":
        return recall_memory(**tool_input)
    else:
        return f"Error: Unknown tool '{tool_name}'"


def run_agent(messages: list, client: anthropic.Anthropic) -> None:
    while True:
        console.print()

        with client.messages.stream(
            model="claude-opus-4-7",
            max_tokens=16000,
            thinking={"type": "adaptive"},
            output_config={"effort": "xhigh"},
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        ) as stream:
            for event in stream:
                if event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        console.print(event.delta.text, end="", markup=False)

            response = stream.get_final_message()

        console.print()
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            break

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    args_preview = json.dumps(block.input)[:80]
                    console.print(
                        f"\n[bold green]⚙ {block.name}[/bold green]([dim]{args_preview}[/dim])",
                    )
                    result = execute_tool(block.name, block.input)
                    preview_lines = result.split("\n")[:5]
                    preview = "\n".join(preview_lines)
                    if len(result.split("\n")) > 5:
                        preview += "\n  [dim]...[/dim]"
                    console.print(f"[dim]{preview}[/dim]")
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            messages.append({"role": "user", "content": tool_results})
        else:
            break


def find_data_files() -> list[Path]:
    current = Path(".")
    patterns = ["*.xlsx", "*.xls", "*.csv"]
    files = []
    for pattern in patterns:
        files.extend(current.glob(pattern))
    return sorted(files)


def main():
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    console.print(Panel(
        Text.from_markup(
            "[bold blue]UtilizeCore Data Analyst Agent[/bold blue]\n\n"
            "Powered by Claude Opus 4.7 with persistent memory.\n"
            "Drop Excel or CSV files in this directory, then ask me to analyze them.\n\n"
            "[dim]Commands: 'help', 'memory', 'outputs', 'quit'[/dim]"
        ),
        title="Welcome",
        border_style="blue",
    ))

    data_files = find_data_files()
    if data_files:
        file_list = "\n".join(f"  • {f.name}" for f in data_files)
        console.print(Panel(
            f"[green]Found {len(data_files)} data file(s) in current directory:[/green]\n{file_list}\n\n"
            "[dim]Ask me to load and analyze any of these files.[/dim]",
            title="Data Files Detected",
            border_style="green",
        ))

    messages = []

    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]You[/bold cyan]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[yellow]Goodbye![/yellow]")
            break

        if not user_input:
            continue

        lower = user_input.lower()

        if lower in ("quit", "exit", "q"):
            console.print("[yellow]Goodbye![/yellow]")
            break

        elif lower == "help":
            console.print(Panel(
                "• Load a file: 'Load the file work_orders.xlsx and analyze it'\n"
                "• Summarize: 'Give me a summary of work order completion rates by vendor'\n"
                "• Charts: 'Create a bar chart of costs by property'\n"
                "• Export: 'Export completed work orders to a new Excel file'\n"
                "• Memory: 'Save this insight about vendor performance'\n"
                "• Recall: 'What do you remember about our vendor data?'\n\n"
                "[dim]Commands: 'memory' (show all), 'outputs' (list files), 'quit'[/dim]",
                title="Help",
                border_style="cyan",
            ))
            continue

        elif lower == "memory":
            result = recall_memory(limit=20)
            console.print(Panel(result, title="Saved Memories", border_style="magenta"))
            continue

        elif lower == "outputs":
            output_path = Path("outputs")
            if not output_path.exists() or not list(output_path.iterdir()):
                console.print("[yellow]No output files yet.[/yellow]")
            else:
                files = sorted(output_path.iterdir())
                file_list = "\n".join(f"  • {f.name} ({f.stat().st_size // 1024} KB)" for f in files)
                console.print(Panel(file_list, title="Output Files", border_style="green"))
            continue

        messages.append({"role": "user", "content": user_input})

        try:
            run_agent(messages, client)
        except anthropic.RateLimitError:
            console.print("[red]Rate limit reached. Please wait a moment and try again.[/red]")
            messages.pop()
        except anthropic.APIError as e:
            console.print(f"[red]API error: {e}[/red]")
            messages.pop()
        except Exception as e:
            console.print(f"[red]Unexpected error: {type(e).__name__}: {e}[/red]")
            messages.pop()


if __name__ == "__main__":
    main()
