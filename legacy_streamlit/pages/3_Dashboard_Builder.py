import streamlit as st

from auth import check_password, logout_button
import db
import kpi

st.set_page_config(page_title="Dashboard Builder", page_icon="🛠️", layout="wide")
check_password()
logout_button()

st.title("🛠️ Dashboard Builder")

datasets_df = db.list_datasets()
if datasets_df.empty:
    st.info("Upload at least one dataset first (see **Upload Data** in the sidebar).")
    st.stop()

dataset_options = dict(zip(datasets_df["display_name"], datasets_df["table_name"]))

existing_dashboards = db.list_dashboards()
choice = st.selectbox(
    "Dashboard to edit",
    ["➕ New dashboard"] + existing_dashboards,
    key="dashboard_choice",
)

if "builder_loaded_for" not in st.session_state or st.session_state["builder_loaded_for"] != choice:
    if choice == "➕ New dashboard":
        st.session_state["builder_name"] = ""
        st.session_state["builder_cards"] = []
    else:
        config = db.load_dashboard(choice)
        st.session_state["builder_name"] = choice
        st.session_state["builder_cards"] = config.get("cards", [])
    st.session_state["builder_loaded_for"] = choice

st.session_state["builder_name"] = st.text_input("Dashboard name", value=st.session_state["builder_name"])

st.divider()
st.subheader("Cards in this dashboard")

if not st.session_state["builder_cards"]:
    st.write("No cards yet. Add a KPI or chart card below.")
else:
    for i, card in enumerate(st.session_state["builder_cards"]):
        cols = st.columns([5, 1])
        with cols[0]:
            if card["type"] == "kpi":
                st.write(f"**KPI** — {card['title']} ({card['dataset_name']}, {kpi.KPI_AGGS.get(card['agg'], card['agg'])})")
            else:
                st.write(f"**Chart** — {card['title']} ({card['chart_type']} on {card['dataset_name']})")
        with cols[1]:
            if st.button("Remove", key=f"remove_{i}"):
                st.session_state["builder_cards"].pop(i)
                st.rerun()

st.divider()
tab_kpi, tab_chart = st.tabs(["➕ Add KPI card", "➕ Add chart card"])

with tab_kpi:
    with st.form("add_kpi_form"):
        title = st.text_input("Card title", key="kpi_title")
        dataset_name = st.selectbox("Dataset", list(dataset_options.keys()), key="kpi_dataset")
        agg = st.selectbox("Aggregation", list(kpi.KPI_AGGS.keys()), format_func=lambda k: kpi.KPI_AGGS[k], key="kpi_agg")

        columns = db.get_dataset_columns(dataset_options[dataset_name]) if dataset_name else []
        needs_column = agg not in ("count_rows", "pct_match")
        column = st.selectbox("Column", columns, key="kpi_column") if needs_column else None

        filter_query = st.text_input(
            "Optional filter (pandas query syntax, e.g. status == 'Completed')", key="kpi_filter"
        )
        add_kpi = st.form_submit_button("Add KPI card")

    if add_kpi:
        if not title.strip():
            st.error("Please give the card a title.")
        else:
            st.session_state["builder_cards"].append({
                "type": "kpi",
                "title": title.strip(),
                "dataset_name": dataset_name,
                "table_name": dataset_options[dataset_name],
                "agg": agg,
                "column": column,
                "filter": filter_query.strip() or None,
            })
            st.rerun()

with tab_chart:
    with st.form("add_chart_form"):
        c_title = st.text_input("Card title", key="chart_title")
        c_dataset_name = st.selectbox("Dataset", list(dataset_options.keys()), key="chart_dataset")
        c_type = st.selectbox("Chart type", kpi.CHART_TYPES, key="chart_type")

        c_columns = db.get_dataset_columns(dataset_options[c_dataset_name]) if c_dataset_name else []
        c_x = st.selectbox("X-axis / category column", c_columns, key="chart_x")
        c_y = st.selectbox("Y-axis / value column (leave blank to count rows)", ["(count of rows)"] + c_columns, key="chart_y")
        c_agg = st.selectbox("Aggregation", list(kpi.CHART_AGGS.keys()), format_func=lambda k: kpi.CHART_AGGS[k], key="chart_agg")
        c_color = st.selectbox("Color / group by (optional)", ["(none)"] + c_columns, key="chart_color")
        c_filter = st.text_input(
            "Optional filter (pandas query syntax, e.g. cost > 1000)", key="chart_filter"
        )
        add_chart = st.form_submit_button("Add chart card")

    if add_chart:
        if not c_title.strip():
            st.error("Please give the card a title.")
        else:
            st.session_state["builder_cards"].append({
                "type": "chart",
                "title": c_title.strip(),
                "dataset_name": c_dataset_name,
                "table_name": dataset_options[c_dataset_name],
                "chart_type": c_type,
                "x": c_x,
                "y": None if c_y == "(count of rows)" else c_y,
                "agg": "count" if c_y == "(count of rows)" else c_agg,
                "color": None if c_color == "(none)" else c_color,
                "filter": c_filter.strip() or None,
            })
            st.rerun()

st.divider()
save_col, delete_col = st.columns(2)
with save_col:
    if st.button("💾 Save dashboard", type="primary"):
        name = st.session_state["builder_name"].strip()
        if not name:
            st.error("Please enter a dashboard name.")
        elif not st.session_state["builder_cards"]:
            st.error("Add at least one card before saving.")
        else:
            db.save_dashboard(name, {"name": name, "cards": st.session_state["builder_cards"]})
            st.success(f"Saved dashboard '{name}'.")
            st.session_state["builder_loaded_for"] = None

with delete_col:
    if choice != "➕ New dashboard" and st.button("🗑️ Delete this dashboard"):
        db.delete_dashboard(choice)
        st.session_state["builder_loaded_for"] = None
        st.success(f"Deleted dashboard '{choice}'.")
        st.rerun()
