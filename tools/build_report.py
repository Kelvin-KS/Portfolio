"""Build public/how-this-site-was-tested/index.html from data/test-results.json.

Re-run after adding new results (e.g. the real iPhone Safari run):
    python3 tools/build_report.py
"""
import html
import json
import pathlib
import re
from collections import Counter, OrderedDict

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data" / "test-results.json").read_text())
OUT = ROOT / "public" / "how-this-site-was-tested" / "index.html"
SITE = "https://kelvin-sakyi.netlify.app"

e = html.escape
results = DATA["results"]
findings = OrderedDict(sorted(DATA["findings"].items()))

AREAS = ["Loading & navigation", "Theme", "Hero", "How I work", "Case study", "QA Lab",
         "Projects & links", "Contact & CV", "General", "Accessibility & performance"]
SCOPE = {"every": "Every device", "laptop": "Laptop only", "once": "Once is enough"}
STATUS_LABEL = {"pass": "Pass", "fail": "Fail", "blocked": "Blocked", "na": "N/A", None: "Not run"}
STATUS_CHIP = {"pass": "chip--pass", "fail": "chip--fail", "blocked": "chip--pend", "na": "chip--pend", None: "chip--pend"}

# ---------- aggregate ----------
tcs = OrderedDict()
for r in sorted(results, key=lambda r: r["tc"]):
    tcs.setdefault(r["tc"], {"title": r["title"], "area": r["area"], "scope": r["scope"], "runs": []})["runs"].append(r)


def setup_name(r):
    emulated = "emulated" in r["browser"]
    return (r["device"], "Chrome device mode" if emulated else r["browser"], emulated)


setups = OrderedDict()
for r in results:
    if r.get("status") is None:
        continue
    key = setup_name(r)
    setups.setdefault(key, Counter())[r["status"]] += 1

recorded = [r for r in results if r.get("status")]
totals = Counter(r["status"] for r in recorded)
real_setups = [k for k in setups if not k[2]]
emu_setups = [k for k in setups if k[2]]


def order_key(k):
    names = ["Galaxy S22", "iPhone 13", "Galaxy A15", "Galaxy A32", "Galaxy S6", "Galaxy Tab A", "Laptop"]
    return (k[2] is False, names.index(k[0]) if k[0] in names else 99)


def clean_note(n):
    n = re.sub(r"^AI-assisted automated check[^:]*:\s*", "", n or "")
    n = re.sub(r"\bTrue\b", "yes", n)
    return re.sub(r"\bFalse\b", "no", n)


def representative(runs):
    """Prefer a real-device result, then the laptop, then any emulated one."""
    applied = [r for r in runs if r.get("status") and r["status"] != "na"]
    phones = [r for r in applied if "emulated" not in r["browser"] and r["device"] != "Laptop"]
    laptop = [r for r in applied if r["device"] == "Laptop"]
    for group in (phones, laptop, applied):
        if group:
            return group[-1]
    return runs[0]


def how_tested(r):
    if "emulated" in r["browser"]:
        return "AI-assisted automated check · emulated"
    if (r.get("note") or "").startswith("AI-assisted"):
        return "AI-assisted automated check"
    return "Tested by hand"


# ---------- sections ----------
def matrix_rows():
    rows = []
    for k in sorted(setups, key=order_key):
        c = setups[k]
        device, browser, emu = k
        kind = ('<span class="tag">Emulated</span>' if emu else
                '<span class="tag">Desktop</span>' if device == "Laptop" else
                '<span class="tag tag--real">Real device</span>')
        total = sum(c.values())
        rows.append(
            f"<tr><th scope=\"row\">{e(device)} <span class=\"muted\">· {e(browser)}</span> {kind}</th>"
            f"<td class=\"num p\">{c['pass']}</td><td class=\"num{' f' if c['fail'] else ''}\">{c['fail']}</td>"
            f"<td class=\"num{' b' if c['blocked'] else ''}\">{c['blocked']}</td><td class=\"num\">{c['na']}</td>"
            f"<td class=\"num\">{total}</td></tr>")
    rows.append('<tr class="pending-row"><th scope="row">iPhone 13 <span class="muted">· Safari</span> '
                '<span class="tag tag--real">Real device</span></th><td colspan="5">Pending: planned when a real iPhone is available</td></tr>')
    return "\n".join(rows)


def finding_cards():
    out = []
    for fid, f in findings.items():
        status = "Fixed &amp; retested" if f.get("status") == "fixed" else "Open"
        chip = "chip--pass" if f.get("status") == "fixed" else "chip--fail"
        rows = "".join(f"<div><dt>{label}</dt><dd>{e(f[key])}</dd></div>"
                       for label, key in (("Found", "found"), ("Cause", "cause"), ("Fix", "fix"), ("Retest", "retest")) if f.get(key))
        stamp = ' data-stamp="fixed"' if f.get("status") == "fixed" else ""
        out.append(f"""<article class="finding bracket">
        <div class="finding-head"><span class="mono">{e(fid)}</span><span class="chip {chip}"{stamp}>{status}</span></div>
        <h3>{e(f['title'])}</h3>
        <dl>{rows}</dl>
        <p class="finding-by">Found by: {e(f.get('foundBy', ''))}</p>
      </article>""")
    return "\n".join(out)


def case_tables():
    out = []
    for area in AREAS:
        items = [(tc, d) for tc, d in tcs.items() if d["area"] == area]
        if not items:
            continue
        rows = []
        for tc, d in items:
            c = Counter(r.get("status") for r in d["runs"])
            summary = " ".join(f'<span class="chip {STATUS_CHIP[s]}">{STATUS_LABEL[s]} ×{n}</span>'
                               for s, n in sorted(c.items(), key=lambda x: ["pass", "fail", "blocked", "na", None].index(x[0])))
            rep = representative(d["runs"])
            rows.append(f"""<tr>
            <td class="mono">{e(tc)}</td>
            <td><strong>{e(d['title'])}</strong><span class="scope">{SCOPE[d['scope']]}</span></td>
            <td class="res">{summary}</td>
            <td class="note">{e(clean_note(rep.get('note')))}<span class="how">{e(rep['device'])} · {e(setup_name(rep)[1])} · {how_tested(rep)}</span></td>
          </tr>""")
        out.append(f"""<details class="area"{' open' if area == AREAS[0] else ''}>
        <summary><span>{e(area)}</span><span class="muted mono">{len(items)} cases</span></summary>
        <div class="table-wrap"><table class="cases">
          <thead><tr><th scope="col">ID</th><th scope="col">Test case</th><th scope="col">Results</th><th scope="col">Actual result (example run)</th></tr></thead>
          <tbody>{''.join(rows)}</tbody>
        </table></div>
      </details>""")
    return "\n".join(out)


EVIDENCE = [
    ("tc-39-lighthouse-scores.webp", "TC-39 · Lighthouse, mobile, Incognito: 98 · 100 · 100 · 100", 824, 175),
    ("tc-39-lighthouse-metrics.webp", "TC-39 · Metrics: LCP 1.8s, Total Blocking Time 0 ms, CLS 0", 824, 265),
    ("tc-39-lighthouse-first-run-extensions.webp", "TC-39 · The first run scored 63 and Lighthouse flagged browser extensions, so it was re-run clean", 824, 340),
    ("tc-34-whatsapp-preview.webp", "TC-34 · Link preview in WhatsApp: title, description and image", 876, 260),
    ("tc-26-copy-email.webp", "TC-26 · Copy email on a real Galaxy A32: 'Copied' on the page and in Android", 540, 940),
    ("tc-27-email-link-open-with.webp", "TC-27 · Email link on a real Galaxy A32 opens the mail app chooser", 540, 700),
]


def evidence_figs():
    return "\n".join(f"""<figure class="evidence">
        <img src="/assets/evidence/{f}" alt="{e(cap)}" width="{w}" height="{h}" loading="lazy" decoding="async">
        <figcaption>{e(cap)}</figcaption>
      </figure>""" for f, cap, w, h in EVIDENCE)


n_cases = len(tcs)
n_results = len(recorded)
n_setups = len(setups)
n_find = len(findings)
n_fixed = sum(1 for f in findings.values() if f.get("status") == "fixed")

page = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How this site was tested · Kelvin Sakyi</title>
  <meta name="description" content="The full test report for Kelvin Sakyi's portfolio: {n_cases} test cases, {n_results} recorded results across {n_setups} device and browser setups, and {n_find} issues found, fixed and retested.">
  <meta name="theme-color" content="#121417">
  <link rel="canonical" href="{SITE}/how-this-site-was-tested/">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{SITE}/how-this-site-was-tested/">
  <meta property="og:title" content="How this site was tested · Kelvin Sakyi">
  <meta property="og:description" content="{n_cases} test cases, {n_results} results, {n_find} issues found and fixed. Lighthouse 98 · 100 · 100 · 100.">
  <meta property="og:image" content="{SITE}/assets/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="/css/styles.css">
  <script src="/js/theme-init.js"></script>
  <script src="/js/report.js" defer></script>
</head>
<body class="report-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="Kelvin Sakyi, back to the homepage">
        <span class="brand-mark">KS</span><span class="brand-slash">/</span><span class="brand-sub">test report</span>
      </a>
      <nav class="site-nav" id="site-nav" aria-label="Report sections">
        <ul>
          <li><a href="#method">Method</a></li>
          <li><a href="#devices">Devices</a></li>
          <li><a href="#issues">Issues</a></li>
          <li><a href="#evidence">Evidence</a></li>
          <li><a href="#cases">All cases</a></li>
          <li><a href="/">← Portfolio</a></li>
        </ul>
      </nav>
      <div class="header-tools">
        <button class="theme-toggle" type="button" id="theme-toggle" aria-label="Theme: automatic">
          <span class="theme-dot" aria-hidden="true"></span>
          <span class="theme-label" id="theme-label">Auto</span>
        </button>
        <button class="menu-toggle" type="button" id="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
      </div>
    </div>
  </header>

  <main id="main">
    <section class="report-hero">
      <div class="report-scan" aria-hidden="true"></div>
      <div class="container">
        <p class="eyebrow">Test report · kelvin-sakyi.netlify.app · updated {e(DATA['exported'])}</p>
        <h1>How this site was tested</h1>
        <p class="section-intro">I don't just say this site works. Here's the evidence: the test plan, every device it ran on, the bugs it caught, and how each one was fixed and retested.</p>
        <dl class="scope report-scope">
          <div><dt>Test cases</dt><dd><span data-count="{n_cases}">{n_cases}</span></dd></div>
          <div><dt>Results recorded</dt><dd><span data-count="{n_results}">{n_results}</span></dd></div>
          <div><dt>Device setups</dt><dd><span data-count="{n_setups}">{n_setups}</span></dd></div>
          <div><dt>Issues fixed</dt><dd><span data-count="{n_fixed}">{n_fixed}</span>/{n_find}</dd></div>
        </dl>
        <p class="lighthouse"><span class="mono">Lighthouse (mobile)</span> <b data-count="98">98</b> Performance · <b data-count="100">100</b> Accessibility · <b data-count="100">100</b> Best Practices · <b data-count="100">100</b> SEO</p>
      </div>
    </section>

    <section class="section" id="method" aria-labelledby="method-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">Method</p>
          <h2 id="method-title">One plan, two ways of running it</h2>
          <p class="section-intro">The same {n_cases} test cases, each with steps and an expected result, were run by automation on emulated devices and by hand on real ones. Every result says which it was.</p>
        </header>
        <div class="method-grid">
          <div class="method">
            <h3>The plan</h3>
            <p>{n_cases} test cases across {len([a for a in AREAS if any(d['area'] == a for d in tcs.values())])} areas: navigation, theme, the hero, the QA Lab, contact and CV, accessibility and performance. Each case is marked <em>every device</em>, <em>laptop only</em> or <em>once is enough</em>, so effort goes where the risk is.</p>
          </div>
          <div class="method">
            <h3>AI-assisted automated checks</h3>
            <p>I directed an AI assistant to script my test cases against the live site in Chrome's device mode: {len(emu_setups)} emulated phones and tablet plus desktop Chrome. Each check follows the steps and compares actual with expected. It covered screen sizes, dark mode, rotation, large text, reduce-motion and a slow 4G connection.</p>
          </div>
          <div class="method">
            <h3>By hand, on real devices</h3>
            <p>What automation can't do honestly: the clipboard, the phone's mail app, the real system font setting, Lighthouse, link previews in WhatsApp and LinkedIn, and signed-in links. Done on a real Galaxy A32 (Chrome) and my laptop.</p>
          </div>
          <div class="method method--limits">
            <h3>Known limits</h3>
            <p>Emulation runs Chrome's engine, so it is not a real Safari or Samsung Internet test. <strong>A real iPhone Safari run is still pending</strong> and will be added to this page.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="devices" aria-labelledby="devices-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">Coverage</p>
          <h2 id="devices-title">Results by device</h2>
          <p class="section-intro">Final status of every recorded result. Blocked means the test could not run in that setup (for example, headless Chrome has no clipboard) and was covered on a real device instead.</p>
        </header>
        <div class="table-wrap"><table class="matrix">
          <thead><tr><th scope="col">Device · browser</th><th scope="col">Pass</th><th scope="col">Fail</th><th scope="col">Blocked</th><th scope="col">N/A</th><th scope="col">Total</th></tr></thead>
          <tbody>
{matrix_rows()}
          </tbody>
          <tfoot><tr><th scope="row">All setups</th><td class="num p">{totals['pass']}</td><td class="num">{totals['fail']}</td><td class="num">{totals['blocked']}</td><td class="num">{totals['na']}</td><td class="num">{n_results}</td></tr></tfoot>
        </table></div>
      </div>
    </section>

    <section class="section" id="issues" aria-labelledby="issues-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">Issues found &amp; fixed</p>
          <h2 id="issues-title">{n_find} bugs caught before a visitor could</h2>
          <p class="section-intro">Every issue follows the same cycle: found, documented, fixed, then retested. The fail is kept on record rather than quietly overwritten.</p>
        </header>
        <div class="findings">
{finding_cards()}
        </div>
      </div>
    </section>

    <section class="section" id="evidence" aria-labelledby="evidence-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">Evidence</p>
          <h2 id="evidence-title">Screenshots from the real runs</h2>
        </header>
        <div class="evidence-grid">
{evidence_figs()}
        </div>
      </div>
    </section>

    <section class="section" id="lessons" aria-labelledby="lessons-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">Lessons</p>
          <h2 id="lessons-title">What this round taught me</h2>
        </header>
        <ol class="lessons">
          <li><h3>Question a bad result before "fixing" the site</h3><p>Lighthouse first scored Performance 63. It named browser extensions as the cause. Re-run in a clean Incognito window: 98. Nothing needed changing.</p></li>
          <li><h3>Automation can be wrong too</h3><p>The automated run reported four failures that turned out to be mistakes in the test script (a hidden spam-trap field, reading a result too early, a desktop touch setting and where keyboard focus started). Each was investigated and re-run before anything was recorded; none are counted as site bugs.</p></li>
          <li><h3>Emulation is not a real phone</h3><p>Copying to the clipboard and opening the mail app could only be proven on a real Galaxy A32. That's also why a real iPhone Safari run is still on the list.</p></li>
          <li><h3>Bugs live at the edges</h3><p>F-13 only appeared with a large system font on mid-width phones. Normal settings never showed it. It was found, fixed, retested at three screen sizes, regression-tested, then confirmed on a real phone at maximum font size.</p></li>
        </ol>
      </div>
    </section>

    <section class="section" id="cases" aria-labelledby="cases-title">
      <div class="container">
        <header class="section-head">
          <p class="eyebrow">All test cases</p>
          <h2 id="cases-title">The full plan and results</h2>
          <p class="section-intro">Each row shows how many setups passed, and the actual result from one example run (a real-device run where there is one).</p>
        </header>
{case_tables()}
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p><a href="/">← Back to the portfolio</a></p>
      <p>Test plan v1 · report generated from the recorded results.</p>
    </div>
  </footer>
</body>
</html>
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(page)
print(f"wrote {OUT.relative_to(ROOT)}: {n_cases} cases, {n_results} results, {n_setups} setups, {n_fixed}/{n_find} issues fixed")
print("status totals:", dict(totals))
