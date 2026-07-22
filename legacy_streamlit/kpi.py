"""Aggregation helpers shared by the dashboard builder and viewer."""
import pandas as pd

KPI_AGGS = {
    "count_rows": "Count of rows",
    "pct_match": "% of rows matching filter",
    "sum": "Sum of column",
    "avg": "Average of column",
    "min": "Minimum of column",
    "max": "Maximum of column",
    "count_distinct": "Count of distinct values",
}

CHART_AGGS = {
    "sum": "Sum",
    "avg": "Average",
    "count": "Count",
    "min": "Minimum",
    "max": "Maximum",
}

CHART_TYPES = ["bar", "line", "pie", "area", "scatter"]


def apply_filter(df: pd.DataFrame, filter_query: str | None) -> pd.DataFrame:
    if not filter_query:
        return df
    try:
        return df.query(filter_query)
    except Exception as e:
        raise ValueError(f"Invalid filter '{filter_query}': {e}") from e


def compute_kpi(df: pd.DataFrame, agg: str, column: str | None = None, filter_query: str | None = None):
    total = len(df)

    if agg == "pct_match":
        matched = apply_filter(df, filter_query)
        return round((len(matched) / total * 100), 1) if total else 0.0

    working = apply_filter(df, filter_query)

    if agg == "count_rows":
        return len(working)
    if not column:
        raise ValueError(f"Aggregation '{agg}' requires a column.")
    if column not in working.columns:
        raise ValueError(f"Column '{column}' not found.")

    series = working[column]
    if agg == "sum":
        return round(float(series.sum()), 2)
    if agg == "avg":
        return round(float(series.mean()), 2) if len(series) else 0.0
    if agg == "min":
        return series.min()
    if agg == "max":
        return series.max()
    if agg == "count_distinct":
        return int(series.nunique())

    raise ValueError(f"Unknown aggregation '{agg}'")


def chart_data(
    df: pd.DataFrame,
    x: str,
    y: str | None,
    agg: str = "sum",
    color: str | None = None,
    filter_query: str | None = None,
) -> pd.DataFrame:
    working = apply_filter(df, filter_query)
    group_cols = [x] + ([color] if color and color != x else [])

    if y is None or agg == "count":
        result = working.groupby(group_cols).size().reset_index(name="value")
    else:
        agg_func = {"sum": "sum", "avg": "mean", "min": "min", "max": "max"}[agg]
        result = working.groupby(group_cols)[y].agg(agg_func).reset_index(name="value")

    return result.sort_values("value", ascending=False)
