"""Build Kelvin's CV (and private references sheet) as PDFs using headless Chrome.

Public CV       -> public/assets/Kelvin-Sakyi-CV.pdf        (no phone, employer not named)
Private CV      -> cv/out/Kelvin-Sakyi-CV-private.pdf       (phone numbers + employer)
References      -> cv/out/Kelvin-Sakyi-References.pdf       (send only when a company asks)

Private details live in cv/private.json, which is git-ignored, so phone numbers,
the employer's name and referees' details never reach the public repository.
Usage: python3 cv/build.py [portfolio-url]   (defaults to the live Netlify site)
"""
import html
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CV = ROOT / "cv"
OUT = CV / "out"
ICONS = (CV / "icons.svg").read_text()
portfolio = sys.argv[1] if len(sys.argv) > 1 else "https://kelvin-sakyi.netlify.app"

try:
    private = json.loads((CV / "private.json").read_text())
except FileNotFoundError:
    private = None


def icon_item(icon, content):
    return f'<li><svg class="ic"><use href="#i-{icon}"/></svg>{content}</li>'


def phone_items(phone):
    if not phone:
        return ""
    items = []
    for part in phone.split(" · "):
        icon = "chat" if "whatsapp" in part.lower() else "phone"
        items.append(icon_item(icon, html.escape(part)))
    return "\n    ".join(items)


def portfolio_item():
    if not portfolio:
        return ""
    label = html.escape(portfolio.replace("https://", "").rstrip("/"))
    return icon_item("globe", f'<a href="{html.escape(portfolio)}">{label}</a>')


def references_html(refs):
    blocks = []
    for r in refs:
        e = {k: html.escape(v) for k, v in r.items()}
        rel = f'<p class="rel">{e["relationship"]}</p>' if e.get("relationship") else ""
        blocks.append(f"""<div class="ref">
    <h3>{e['name']}</h3>
    <p class="role-line">{e['role']} · {e['org']}</p>
    {rel}
    <ul>
      {icon_item('mail', e['email'])}
      {icon_item('phone', e['phone'])}
    </ul>
  </div>""")
    return "\n  ".join(blocks)


def to_pdf(template_name, replacements, out_pdf):
    page = (CV / template_name).read_text().replace("{{ICONS}}", ICONS)
    for key, value in replacements.items():
        page = page.replace("{{" + key + "}}", value)
    OUT.mkdir(exist_ok=True)
    tmp = OUT / (out_pdf.stem + ".html")
    tmp.write_text(page)
    subprocess.run([
        "google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
        "--no-pdf-header-footer", "--virtual-time-budget=5000",
        f"--print-to-pdf={out_pdf}", tmp.as_uri(),
    ], check=True, capture_output=True)
    print("wrote", out_pdf.relative_to(ROOT))


to_pdf("template.html", {
    "PHONE": "", "COMPANY": "Remote software &amp; design company", "PORTFOLIO": portfolio_item(),
}, ROOT / "public" / "assets" / "Kelvin-Sakyi-CV.pdf")

if private:
    to_pdf("template.html", {
        "PHONE": phone_items(private["phone"]),
        "COMPANY": html.escape(private["company"]),
        "PORTFOLIO": portfolio_item(),
    }, OUT / "Kelvin-Sakyi-CV-private.pdf")
    if private.get("references"):
        to_pdf("references-template.html", {
            "PHONE": phone_items(private["phone"]),
            "REFERENCES": references_html(private["references"]),
        }, OUT / "Kelvin-Sakyi-References.pdf")
