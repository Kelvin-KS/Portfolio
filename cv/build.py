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
import re
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
        digits = re.sub(r"\D", "", part.split("(")[0])
        if "whatsapp" in part.lower():
            link = f'<a href="https://wa.me/{digits}">{html.escape(part)}</a>'
            items.append(icon_item("chat", link))
        else:
            link = f'<a href="tel:+{digits}">{html.escape(part)}</a>'
            items.append(icon_item("phone", link))
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


REFS_ON_REQUEST = '<div><h2><svg class="ic"><use href="#i-users"/></svg>Referees</h2><p>Available on request.</p></div>'


def to_pdf(template_name, replacements, out_pdf):
    page = (CV / template_name).read_text().replace("{{ICONS}}", ICONS)
    for key, value in replacements.items():
        page = page.replace("{{" + key + "}}", value)
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if leftover:
        sys.exit(f"{template_name}: unfilled placeholders {sorted(set(leftover))}")
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
    "PORTFOLIO_URL": html.escape(portfolio), "REFBLOCK": REFS_ON_REQUEST,
}, ROOT / "public" / "assets" / "Kelvin-Sakyi-CV.pdf")

if private:
    to_pdf("template.html", {
        "PHONE": phone_items(private["phone"]),
        "COMPANY": html.escape(private["company"]),
        "PORTFOLIO": portfolio_item(),
        "PORTFOLIO_URL": html.escape(portfolio), "REFBLOCK": REFS_ON_REQUEST,
    }, OUT / "Kelvin-Sakyi-CV-private.pdf")
    if private.get("references"):
        to_pdf("references-template.html", {
            "PHONE": phone_items(private["phone"]),
            "REFERENCES": references_html(private["references"]),
        }, OUT / "Kelvin-Sakyi-References.pdf")

    # Application pack: private CV + both referees in one PDF, for forms that ask for
    # "CV with two references (referees)" in a single file named after the applicant.
    both = private.get("references", []) + private.get("personal_references", [])
    if len(both) >= 2:
        to_pdf("references-template.html", {
            "PHONE": phone_items(private["phone"]),
            "REFERENCES": references_html(both),
        }, OUT / "Kelvin-Sakyi-References-two.pdf")
        # The CV inside the pack points to the referees instead of saying "available on request".
        to_pdf("template.html", {
            "PHONE": phone_items(private["phone"]), "COMPANY": html.escape(private["company"]),
            "PORTFOLIO": portfolio_item(), "PORTFOLIO_URL": html.escape(portfolio),
            "REFBLOCK": "",  # the referees page follows, so no section here
        }, OUT / "Kelvin-Sakyi-CV-pack.pdf")
        pack = OUT / "Kelvin Sakyi - CV and Referees.pdf"
        subprocess.run(["pdfunite", str(OUT / "Kelvin-Sakyi-CV-pack.pdf"),
                        str(OUT / "Kelvin-Sakyi-References-two.pdf"), str(pack)], check=True)
        print("wrote", pack.relative_to(ROOT))
