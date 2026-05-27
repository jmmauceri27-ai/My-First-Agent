import markdown
from weasyprint import HTML

with open("ebv_mecfs_research_report.md", "r") as f:
    md_content = f.read()

html_body = markdown.markdown(md_content, extensions=["tables"])

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{
    margin: 2cm 2.2cm;
    @bottom-center {{
      content: counter(page);
      font-family: Georgia, serif;
      font-size: 9px;
      color: #888;
    }}
  }}
  body {{
    font-family: Georgia, serif;
    font-size: 11px;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 100%;
  }}
  h1 {{
    font-size: 22px;
    color: #1b2a4a;
    border-bottom: 3px solid #2e6da4;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 4px;
  }}
  h2 {{
    font-size: 14px;
    color: #ffffff;
    background: #2e6da4;
    padding: 6px 12px;
    border-radius: 3px;
    margin-top: 24px;
    margin-bottom: 6px;
  }}
  h3 {{
    font-size: 12px;
    color: #1b2a4a;
    border-left: 4px solid #2e6da4;
    padding-left: 8px;
    margin-top: 16px;
    margin-bottom: 4px;
    background: #f0f5fb;
    padding: 5px 8px;
  }}
  h4 {{
    font-size: 11px;
    color: #2e6da4;
    margin-top: 12px;
    margin-bottom: 2px;
  }}
  p {{
    margin: 5px 0;
  }}
  ul {{
    margin: 4px 0 6px 0;
    padding-left: 20px;
  }}
  li {{
    margin: 2px 0;
  }}
  strong {{
    color: #1b2a4a;
  }}
  em {{
    color: #555;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    font-size: 10px;
    margin: 10px 0 14px 0;
  }}
  th {{
    background: #1b2a4a;
    color: #ffffff;
    padding: 6px 8px;
    text-align: left;
    font-size: 10px;
  }}
  td {{
    border: 1px solid #c8d6e8;
    padding: 5px 8px;
    vertical-align: top;
  }}
  tr:nth-child(even) td {{
    background: #f0f5fb;
  }}
  hr {{
    border: none;
    border-top: 1px solid #c8d6e8;
    margin: 14px 0;
  }}
  blockquote {{
    border-left: 4px solid #2e6da4;
    margin: 8px 0;
    padding: 4px 12px;
    color: #444;
    background: #f7faff;
  }}
  .disclaimer {{
    font-size: 10px;
    color: #777;
    font-style: italic;
    border: 1px solid #ddd;
    padding: 6px 10px;
    background: #fafafa;
    margin-bottom: 16px;
  }}
</style>
</head>
<body>
<div class="disclaimer">
  For informational purposes only. This is not medical advice. Consult a qualified healthcare provider for diagnosis and treatment decisions.
</div>
{html_body}
</body>
</html>"""

HTML(string=html).write_pdf("ebv_mecfs_research_report.pdf")
print("PDF created successfully.")
