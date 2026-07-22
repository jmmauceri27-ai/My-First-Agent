import plotly.express as px
import streamlit as st

from auth import check_password, logout_button
import db
import kpi

st.set_page_config(page_title="Dashboards", page_icon="📊", layout="wide")
check_password()
logout_button()

st.title("📊 Dashboards")

dashboards = db.list_dashboards()
if not dashboards:
    st.info("No dashboards yet. Build one in **Dashboard Builder**.")
    st.stop()

name = st.selectbox("Choose a dashboard", dashboards)
config = db.load_dashboard(name)
cards = config.get("cards", [])

if not cards:
    st.warning("This dashboard has no cards yet.")
    st.stop()

_df_cache = {}


def _get_df(table_name):
    if table_name not in _df_cache:
        _df_cache[table_name] = db.get_dataframe(table_name)
    return _df_cache[table_name]


kpi_cards = [c for c in cards if c["type"] == "kpi"]
chart_cards = [c for c in cards if c["type"] == "chart"]

if kpi_cards:
    cols = st.columns(min(len(kpi_cards), 4))
    for i, card in enumerate(kpi_cards):
        df = _get_df(card["table_name"])
        try:
            value = kpi.compute_kpi(df, card["agg"], card.get("column"), card.get("filter"))
        except ValueError as e:
            value = "—"
            st.error(f"{card['title']}: {e}")
        if card["agg"] == "pct_match":
            value_display = f"{value}%"
        else:
            value_display = value
        with cols[i % len(cols)]:
            st.metric(card["title"], value_display)

if chart_cards:
    st.divider()
    for card in chart_cards:
        df = _get_df(card["table_name"])
        st.subheader(card["title"])
        try:
            data = kpi.chart_data(df, card["x"], card.get("y"), card.get("agg", "sum"), card.get("color"), card.get("filter"))
        except ValueError as e:
            st.error(str(e))
            continue

        color_col = card.get("color") if card.get("color") else None
        chart_type = card["chart_type"]

        if chart_type == "bar":
            fig = px.bar(data, x=card["x"], y="value", color=color_col)
        elif chart_type == "line":
            fig = px.line(data, x=card["x"], y="value", color=color_col, markers=True)
        elif chart_type == "area":
            fig = px.area(data, x=card["x"], y="value", color=color_col)
        elif chart_type == "scatter":
            fig = px.scatter(data, x=card["x"], y="value", color=color_col)
        elif chart_type == "pie":
            fig = px.pie(data, names=card["x"], values="value")
        else:
            st.error(f"Unknown chart type '{chart_type}'")
            continue

        st.plotly_chart(fig, width='stretch')
