"""Parse uploaded Excel/CSV files into clean pandas DataFrames."""
from typing import IO

import pandas as pd

CATEGORIES = ["Work Orders", "Invoices", "Proposals", "Vendors", "Properties", "Other"]


def _clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def read_upload(file: IO, filename: str) -> dict[str, pd.DataFrame]:
    """Return a dict of sheet_name -> DataFrame for an uploaded xlsx/xls/csv file."""
    suffix = filename.lower().rsplit(".", 1)[-1]

    if suffix in ("xlsx", "xls"):
        xl = pd.ExcelFile(file)
        return {name: _clean_columns(xl.parse(name)) for name in xl.sheet_names}

    if suffix == "csv":
        return {"Sheet1": _clean_columns(pd.read_csv(file))}

    raise ValueError(f"Unsupported file type: .{suffix}. Please upload .xlsx, .xls, or .csv")


def preview(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    return df.head(n)


def null_summary(df: pd.DataFrame) -> pd.DataFrame:
    nulls = df.isnull().sum()
    nulls = nulls[nulls > 0]
    return nulls.rename("null_count").to_frame()
