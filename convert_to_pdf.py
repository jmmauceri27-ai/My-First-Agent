import markdown
from weasyprint import HTML, CSS

with open("ai_newsletters_research.md", "r") as f:
    md_content = f.read()

html_body = markdown.markdown(md_content, extensions=["tables"])

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{
    font-family: Georgia, serif;
    font-size: 11px;
    line-height: 1.5;
    max-width: 900px;
    margin: 0 auto;
    padding: 20px 30px;
    color: #222;
  }}
  h1 {{
    font-size: 20px;
    color: #1a1a2e;
    border-bottom: 2px solid #4a90d9;
    padding-bottom: 6px;
    margin-top: 20px;
  }}
  h2 {{
    font-size: 15px;
    color: #2c3e7a;
    background: #eef2ff;
    padding: 5px 10px;
    border-left: 4px solid #4a90d9;
    margin-top: 20px;
  }}
  h3 {{
    font-size: 13px;
    color: #1a1a2e;
    margin-top: 14px;
    margin-bottom: 4px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 2px;
  }}
  ul {{
    margin: 4px 0;
    padding-left: 18px;
  }}
  li {{
    margin: 2px 0;
  }}
  strong {{
    color: #2c3e7a;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    font-size: 10px;
    margin: 10px 0;
  }}
  th {{
    background: #2c3e7a;
    color: white;
    padding: 5px 7px;
    text-align: left;
  }}
  td {{
    border: 1px solid #ccc;
    padding: 4px 7px;
  }}
  tr:nth-child(even) td {{
    background: #f5f7ff;
  }}
  hr {{
    border: none;
    border-top: 1px solid #ddd;
    margin: 12px 0;
  }}
  p {{
    margin: 4px 0;
  }}
  em {{
    color: #555;
    font-size: 10px;
  }}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

HTML(string=html).write_pdf("ai_newsletters_research.pdf")
print("PDF created successfully.")
