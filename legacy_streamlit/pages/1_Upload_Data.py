import streamlit as st

from auth import check_password, logout_button
import db
import ingestion

st.set_page_config(page_title="Upload Data", page_icon="📤", layout="wide")
check_password()
logout_button()

st.title("📤 Upload Data")
st.caption("Upload an Excel or CSV export from your facility maintenance system.")

uploaded = st.file_uploader("Choose a file", type=["xlsx", "xls", "csv"])

if uploaded is not None:
    try:
        sheets = ingestion.read_upload(uploaded, uploaded.name)
    except ValueError as e:
        st.error(str(e))
        st.stop()

    sheet_name = st.selectbox("Sheet to import", list(sheets.keys())) if len(sheets) > 1 else next(iter(sheets))
    df = sheets[sheet_name]

    st.subheader("Preview")
    st.dataframe(ingestion.preview(df), width='stretch')
    st.caption(f"{df.shape[0]} rows x {df.shape[1]} columns")

    nulls = ingestion.null_summary(df)
    if not nulls.empty:
        with st.expander("Missing values"):
            st.dataframe(nulls, width='stretch')

    st.subheader("Save this dataset")
    default_name = uploaded.name.rsplit(".", 1)[0]
    with st.form("save_dataset_form"):
        display_name = st.text_input("Dataset name", value=default_name)
        category = st.selectbox("Category", ingestion.CATEGORIES)
        submitted = st.form_submit_button("Save to dashboard data")

    if submitted:
        if not display_name.strip():
            st.error("Please enter a dataset name.")
        else:
            table_name = db.ingest_dataframe(display_name.strip(), category, uploaded.name, df)
            st.success(f"Saved '{display_name}' ({len(df)} rows). You can now use it in the Dashboard Builder.")

st.divider()
st.subheader("Existing datasets")
datasets = db.list_datasets()
if datasets.empty:
    st.write("No datasets uploaded yet.")
else:
    for _, row in datasets.iterrows():
        cols = st.columns([4, 2, 2, 2, 1])
        cols[0].write(f"**{row['display_name']}**")
        cols[1].write(row["category"])
        cols[2].write(f"{row['rows']} rows")
        cols[3].write(row["uploaded_at"][:19])
        if cols[4].button("Delete", key=f"del_{row['table_name']}"):
            db.delete_dataset(row["table_name"])
            st.rerun()
