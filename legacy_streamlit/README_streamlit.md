# Facility Maintenance Dashboard

A private Streamlit web app for uploading Excel/CSV exports from your facility
maintenance company (work orders, invoices, proposals, and more) and building
custom KPI dashboards from that data.

## Features

- **Upload Data** — upload `.xlsx`/`.xls`/`.csv` files, preview them, tag them
  with a category, and save them into a persistent local database.
- **Dashboard Builder** — assemble dashboards out of KPI cards (sums,
  averages, counts, % match on a filter, etc.) and charts (bar, line, pie,
  area, scatter) built from any uploaded dataset.
- **Dashboards** — view your saved dashboards with live-computed KPIs and
  charts.
- **Data Explorer** — browse any uploaded dataset, filter it with pandas
  query syntax, and export the filtered view back to Excel.
- **Password-gated** — the whole site sits behind a single shared password.

Uploaded data is stored in a local SQLite database (`data/app.db`) so
dashboards persist across sessions and can show data from multiple uploads
over time.

## Running locally

```bash
pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# edit .streamlit/secrets.toml and set a real app_password
streamlit run app.py
```

The app will open at `http://localhost:8501`.

## Deploying

The simplest option is [Streamlit Community Cloud](https://streamlit.io/cloud):

1. Push this repo to GitHub (already done if you're reading this from there).
2. Create a new app pointing at `app.py` on this branch/repo.
3. In the app's **Settings -> Secrets**, add:
   ```toml
   app_password = "your-real-password"
   ```
4. Deploy.

**Important:** Streamlit Community Cloud's filesystem resets on redeploy, so
the local SQLite database (`data/app.db`) will NOT persist across deploys
there. For a deployment where uploaded data needs to survive redeploys /
restarts, either:
- host on a platform with a persistent disk/volume (e.g. a small VPS,
  Render/Railway with a persistent volume, Fly.io with a volume), or
- point `db.py` at an external database instead of local SQLite (it uses
  plain `sqlite3`, so swapping in Postgres would mean adjusting `db.py`
  accordingly).

## Project layout

```
app.py                      Landing page + auth gate
auth.py                     Shared-password login
db.py                       SQLite storage for datasets + dashboard configs
ingestion.py                Excel/CSV parsing
kpi.py                      KPI + chart aggregation helpers
pages/
  1_Upload_Data.py
  2_Dashboards.py
  3_Dashboard_Builder.py
  4_Data_Explorer.py
legacy_cli/                 Previous CLI-based analyst agent (kept for reference)
```
