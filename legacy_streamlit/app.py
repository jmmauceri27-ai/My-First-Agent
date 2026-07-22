import streamlit as st

from auth import check_password, logout_button
import db

st.set_page_config(page_title="Facility Maintenance Dashboard", page_icon="🛠️", layout="wide")

check_password()
logout_button()

st.title("🛠️ Facility Maintenance Dashboard")
st.caption("Upload your work order, invoice, and proposal exports, then build KPI dashboards from them.")

datasets = db.list_datasets()
dashboards = db.list_dashboards()

col1, col2 = st.columns(2)
with col1:
    st.metric("Datasets uploaded", len(datasets))
with col2:
    st.metric("Saved dashboards", len(dashboards))

st.divider()

if datasets.empty:
    st.info("No data yet. Head to **Upload Data** in the sidebar to add your first Excel or CSV file.")
else:
    st.subheader("Your datasets")
    st.dataframe(
        datasets[["display_name", "category", "rows", "source_filename", "uploaded_at"]],
        width='stretch',
        hide_index=True,
    )

if dashboards:
    st.subheader("Your dashboards")
    for name in dashboards:
        st.write(f"- {name}")
    st.caption("Open **Dashboards** in the sidebar to view them, or **Dashboard Builder** to create a new one.")
else:
    st.info("No dashboards yet. Use **Dashboard Builder** in the sidebar once you've uploaded data.")
