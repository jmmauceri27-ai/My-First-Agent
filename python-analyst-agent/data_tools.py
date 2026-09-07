import sys
import io
import re
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

_dataframes: dict[str, pd.DataFrame] = {}
_output_dir = Path("outputs")


def _ensure_output_dir():
    _output_dir.mkdir(parents=True, exist_ok=True)


def load_file(path: str) -> str:
    file_path = Path(path)
    if not file_path.exists():
        return f"Error: File not found: {path}"

    suffix = file_path.suffix.lower()
    dataset_id = re.sub(r"[^a-zA-Z0-9_]", "_", file_path.stem)

    try:
        if suffix in (".xlsx", ".xls"):
            xl = pd.ExcelFile(path)
            sheet_names = xl.sheet_names
            df = xl.parse(sheet_names[0])
            sheet_info = f"Sheet loaded: '{sheet_names[0]}'"
            if len(sheet_names) > 1:
                sheet_info += f" | Other sheets available: {', '.join(sheet_names[1:])}"
        elif suffix == ".csv":
            df = pd.read_csv(path)
            sheet_info = "CSV file"
        else:
            return f"Error: Unsupported file type '{suffix}'. Supported: .xlsx, .xls, .csv"
    except Exception as e:
        return f"Error loading file: {e}"

    _dataframes[dataset_id] = df

    from memory_store import log_file_load
    log_file_load(file_path.name, dataset_id, len(df), len(df.columns))

    null_counts = df.isnull().sum()
    null_info = null_counts[null_counts > 0]
    null_str = "\n  ".join(f"{col}: {n} nulls" for col, n in null_info.items()) if not null_info.empty else "None"

    preview = df.head(3).to_string(max_cols=10)

    return (
        f"Loaded '{file_path.name}' as dataset '{dataset_id}'\n"
        f"{sheet_info}\n"
        f"Shape: {df.shape[0]} rows x {df.shape[1]} columns\n"
        f"Columns: {', '.join(df.columns.tolist())}\n"
        f"Dtypes:\n  " + "\n  ".join(f"{col}: {dtype}" for col, dtype in df.dtypes.items()) + "\n"
        f"Null values: {null_str}\n"
        f"Preview (first 3 rows):\n{preview}"
    )


def describe_data(dataset_id: str, columns: Optional[list] = None) -> str:
    if dataset_id not in _dataframes:
        return f"Error: Dataset '{dataset_id}' not found. Use load_file first or call list_datasets."
    df = _dataframes[dataset_id]
    if columns:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            return f"Error: Columns not found: {missing}. Available: {df.columns.tolist()}"
        df = df[columns]

    parts = [f"Statistical description of '{dataset_id}' ({df.shape[0]} rows, {df.shape[1]} cols):\n"]

    numeric_cols = df.select_dtypes(include="number")
    if not numeric_cols.empty:
        parts.append("=== Numeric Columns ===")
        parts.append(numeric_cols.describe().to_string())
        parts.append("")

    cat_cols = df.select_dtypes(exclude="number")
    if not cat_cols.empty:
        parts.append("=== Categorical/Text Columns ===")
        for col in cat_cols.columns:
            vc = df[col].value_counts().head(5)
            parts.append(f"\n{col} (top 5 values):")
            parts.append(vc.to_string())
        parts.append("")

    return "\n".join(parts)


def run_analysis(dataset_id: str, code: str) -> str:
    if dataset_id not in _dataframes:
        return f"Error: Dataset '{dataset_id}' not found. Use load_file first."
    df = _dataframes[dataset_id].copy()

    captured = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured
    try:
        exec(code, {"df": df, "pd": pd, "np": np, "print": print})  # noqa: S102
        _dataframes[dataset_id] = df
        output = captured.getvalue()
    except Exception as e:
        output = f"Error during analysis: {type(e).__name__}: {e}"
    finally:
        sys.stdout = old_stdout

    return output if output.strip() else "Code executed successfully (no output printed)."


def create_visualization(
    dataset_id: str,
    chart_type: str,
    title: str,
    x_column: Optional[str] = None,
    y_column: Optional[str] = None,
    hue_column: Optional[str] = None,
    filename: Optional[str] = None,
) -> str:
    if dataset_id not in _dataframes:
        return f"Error: Dataset '{dataset_id}' not found."
    df = _dataframes[dataset_id]
    _ensure_output_dir()

    safe_title = re.sub(r"[^a-zA-Z0-9_\-]", "_", title)
    out_file = _output_dir / (filename or f"{safe_title}.png")

    plt.figure(figsize=(12, 7))
    sns.set_theme(style="whitegrid")

    try:
        chart_type = chart_type.lower()

        if chart_type == "bar":
            if x_column and y_column:
                data = df.groupby(x_column)[y_column].sum().reset_index()
                if data[x_column].nunique() > 20:
                    data = data.nlargest(20, y_column)
                sns.barplot(data=data, x=x_column, y=y_column, hue=hue_column)
                plt.xticks(rotation=45, ha="right")
            else:
                return "Error: bar chart requires x_column and y_column."

        elif chart_type == "line":
            if x_column and y_column:
                sns.lineplot(data=df, x=x_column, y=y_column, hue=hue_column)
                plt.xticks(rotation=45, ha="right")
            else:
                return "Error: line chart requires x_column and y_column."

        elif chart_type == "scatter":
            if x_column and y_column:
                sns.scatterplot(data=df, x=x_column, y=y_column, hue=hue_column, alpha=0.7)
            else:
                return "Error: scatter chart requires x_column and y_column."

        elif chart_type == "histogram":
            col = x_column or y_column
            if not col:
                return "Error: histogram requires x_column."
            sns.histplot(data=df, x=col, hue=hue_column, kde=True)

        elif chart_type == "heatmap":
            numeric_df = df.select_dtypes(include="number")
            if numeric_df.empty:
                return "Error: no numeric columns for heatmap."
            corr = numeric_df.corr()
            sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", center=0)

        elif chart_type == "box":
            if x_column and y_column:
                sns.boxplot(data=df, x=x_column, y=y_column, hue=hue_column)
                plt.xticks(rotation=45, ha="right")
            elif y_column:
                sns.boxplot(data=df, y=y_column)
            else:
                return "Error: box plot requires at least y_column."

        elif chart_type == "pie":
            if not x_column:
                return "Error: pie chart requires x_column for categories."
            counts = df[x_column].value_counts()
            if counts.shape[0] > 15:
                counts = counts.head(15)
            plt.pie(counts.values, labels=counts.index, autopct="%1.1f%%", startangle=140)
            plt.axis("equal")

        else:
            plt.close()
            return f"Error: Unknown chart type '{chart_type}'. Use: bar, line, scatter, histogram, heatmap, box, pie"

        plt.title(title, fontsize=14, fontweight="bold", pad=15)
        plt.tight_layout()
        plt.savefig(out_file, dpi=150, bbox_inches="tight")
        plt.close()

    except Exception as e:
        plt.close()
        return f"Error creating chart: {type(e).__name__}: {e}"

    return f"Chart saved: {out_file}"


def export_to_excel(
    dataset_id: str,
    filename: str,
    include_summary: bool = True,
    filters: Optional[str] = None,
) -> str:
    if dataset_id not in _dataframes:
        return f"Error: Dataset '{dataset_id}' not found."
    df = _dataframes[dataset_id].copy()
    _ensure_output_dir()

    if filters:
        try:
            df = df.query(filters)
        except Exception as e:
            return f"Error applying filter '{filters}': {e}"

    if not filename.endswith(".xlsx"):
        filename += ".xlsx"
    out_path = _output_dir / filename

    try:
        with pd.ExcelWriter(out_path, engine="xlsxwriter") as writer:
            df.to_excel(writer, sheet_name="Data", index=False)
            workbook = writer.book
            worksheet = writer.sheets["Data"]

            header_fmt = workbook.add_format({
                "bold": True,
                "bg_color": "#1F4E79",
                "font_color": "#FFFFFF",
                "border": 1,
                "align": "center",
            })
            for col_num, col_name in enumerate(df.columns):
                worksheet.write(0, col_num, col_name, header_fmt)
                max_len = max(
                    len(str(col_name)),
                    df[col_name].astype(str).str.len().max() if not df.empty else 0,
                )
                worksheet.set_column(col_num, col_num, min(max_len + 2, 40))

            if include_summary:
                summary_data = []
                summary_data.append(["Dataset", dataset_id])
                summary_data.append(["Total Rows", len(df)])
                summary_data.append(["Total Columns", len(df.columns)])
                if filters:
                    summary_data.append(["Filter Applied", filters])

                numeric_cols = df.select_dtypes(include="number")
                for col in numeric_cols.columns[:10]:
                    summary_data.append([f"{col} (sum)", round(df[col].sum(), 2)])
                    summary_data.append([f"{col} (avg)", round(df[col].mean(), 2)])
                    summary_data.append([f"{col} (max)", round(df[col].max(), 2)])

                summary_df = pd.DataFrame(summary_data, columns=["Metric", "Value"])
                summary_df.to_excel(writer, sheet_name="Summary", index=False)
                ws_sum = writer.sheets["Summary"]
                for col_num, col_name in enumerate(summary_df.columns):
                    ws_sum.write(0, col_num, col_name, header_fmt)
                ws_sum.set_column(0, 0, 35)
                ws_sum.set_column(1, 1, 25)

    except Exception as e:
        return f"Error exporting to Excel: {type(e).__name__}: {e}"

    row_info = f"{len(df)} rows" + (f" (filtered from {len(_dataframes[dataset_id])})" if filters else "")
    return f"Exported to {out_path} ({row_info}, {len(df.columns)} columns)"


def list_datasets() -> str:
    if not _dataframes:
        return "No datasets currently loaded. Use load_file to load data."
    lines = [f"Loaded datasets ({len(_dataframes)} total):\n"]
    for name, df in _dataframes.items():
        lines.append(f"  {name}: {df.shape[0]} rows x {df.shape[1]} cols")
        lines.append(f"    Columns: {', '.join(df.columns.tolist()[:10])}" +
                     (" ..." if len(df.columns) > 10 else ""))
    return "\n".join(lines)
