import io

import pandas as pd
import streamlit as st

from auth import check_password, logout_button
import db

st.set_page_config(page_title="Data Explorer", page_icon="🗂️", layout="wide")
check_password()
logout_button()

st.title("🗂️ Data Explorer")

datasets_df = db.list_datasets()
if datasets_df.empty:
    st.info("No datasets uploaded yet. See **Upload Data** in the sidebar.")
    st.stop()

dataset_options = dict(zip(datasets_df["display_name"], datasets_df["table_name"]))
name = st.selectbox("Dataset", list(dataset_options.keys()))
table_name = dataset_options[name]

df = db.get_dataframe(table_name)
st.caption(f"{df.shape[0]} rows x {df.shape[1]} columns")

filter_query = st.text_input("Filter (pandas query syntax, e.g. status == 'Completed' and cost > 500)")

if filter_query:
    try:
        view_df = df.query(filter_query)
    except Exception as e:
        st.error(f"Invalid filter: {e}")
        view_df = df
else:
    view_df = df

st.dataframe(view_df, width='stretch')
st.caption(f"Showing {len(view_df)} of {len(df)} rows")

buffer = io.BytesIO()
with pd.ExcelWriter(buffer, engine="xlsxwriter") as writer:
    view_df.to_excel(writer, sheet_name="Data", index=False)
buffer.seek(0)

st.download_button(
    "⬇️ Download as Excel",
    data=buffer,
    file_name=f"{name}_export.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
)
