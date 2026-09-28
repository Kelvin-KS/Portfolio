"""Build Kelvin's CV as PDF from cv/template.html using headless Chrome.

Public version  -> public/assets/Kelvin-Sakyi-CV.pdf  (no phone, employer not named)
Private version -> cv/out/Kelvin-Sakyi-CV-private.pdf (phone + employer, never committed)

Private details live in cv/private.json, which is git-ignored.
Usage: python3 cv/build.py [portfolio-url]
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CV = ROOT / "cv"
template = (CV / "template.html").read_text()
portfolio = sys.argv[1] if len(sys.argv) > 1 else ""

try:
    private = json.loads((CV / "private.json").read_text())
except FileNotFoundError:
    private = None


def render(phone, company, out_pdf):
    link = f'<a href="{portfolio}">{portfolio.replace("https://", "")}</a>' if portfolio else ""
    html = (template
            .replace("{{PHONE}}", f"<span>{phone}</span>" if phone else "")
            .replace("{{COMPANY}}", company)
            .replace("{{PORTFOLIO}}", link))
    tmp = CV / "out" / (out_pdf.stem + ".html")
    tmp.parent.mkdir(exist_ok=True)
    tmp.write_text(html)
    subprocess.run([
        "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
        "--no-pdf-header-footer", "--virtual-time-budget=5000",
        f"--print-to-pdf={out_pdf}", tmp.as_uri(),
    ], check=True, capture_output=True)
    print("wrote", out_pdf.relative_to(ROOT))


render(None, "Remote software &amp; design company", ROOT / "public" / "assets" / "Kelvin-Sakyi-CV.pdf")
if private:
    render(private["phone"], private["company"], CV / "out" / "Kelvin-Sakyi-CV-private.pdf")
