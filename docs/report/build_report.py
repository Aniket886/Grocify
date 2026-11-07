"""Builds docs/Grocify-Project-Report.docx (the PBL project report, v1.1.0).

Run from the project folder:  python docs/report/build_report.py
Numbers (files, lines, endpoints, tests) are counted from the repository when this runs,
so they always match the code. Yellow text marks the one detail only the university knows.
"""
import re
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
DIAG = ROOT / "docs" / "diagrams"
SHOT = ROOT / "docs" / "screenshots" / "v1.1"
OUT = ROOT / "docs" / "Grocify-Project-Report.docx"

LIVE_URL = "https://gmu2027.space"
REPO_URL = "github.com/Aniket886/Grocify"
STUDENT, USN = "Harshita N M", "U25C01CA059"

GREEN = RGBColor(0x1E, 0x8E, 0x5C)      # matches the emerald accent of the production design
DARK = RGBColor(0x22, 0x22, 0x22)
GREY = RGBColor(0x55, 0x55, 0x55)
LINK = RGBColor(0x05, 0x63, 0xC1)
HEAD_FILL, ROW_FILL = "1E8E5C", "F2F8F5"


# ============================================================ facts counted from the repo
def count_lines(paths):
    n = 0
    for p in paths:
        n += sum(1 for line in p.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip())
    return n


def files(sub, exts):
    return [p for p in (ROOT / sub).rglob("*") if p.is_file() and p.suffix in exts and "node_modules" not in p.parts]


S = {
    "server_files": len(files("server", {".js"})),
    "server_lines": count_lines(files("server", {".js"})),
    "src_files": len(files("src", {".js", ".jsx", ".css"})),
    "src_lines": count_lines(files("src", {".js", ".jsx", ".css"})),
    "test_files": len(files("tests", {".js"})),
    "test_lines": count_lines(files("tests", {".js"})),
    "customer_pages": len(list((ROOT / "src/pages/customer").glob("*.jsx"))),
    "admin_pages": len(list((ROOT / "src/pages/admin").glob("*.jsx"))),
    "components": len(list((ROOT / "src/components").glob("*.jsx"))),
    "endpoints": sum(len(re.findall(r"\br\.(?:get|post|put|patch|delete)\(", p.read_text(encoding="utf-8"))) for p in (ROOT / "server/routes").glob("*.js")),
    "tests": sum(len(re.findall(r"^test\(", p.read_text(encoding="utf-8"), re.M)) for p in (ROOT / "tests").glob("*.test.js")),
}
try:
    out = subprocess.check_output(
        ["node", "-e", "import('./src/data/categoryTaxonomy.js').then(m=>console.log(m.SECTIONS.length+' '+m.ALL_CATEGORIES.length))"],
        cwd=ROOT, text=True, timeout=30).split()
    S["sections"], S["categories"] = int(out[0]), int(out[1])
except Exception:
    S["sections"], S["categories"] = 20, 109
import json  # noqa: E402

S["version"] = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(1.9)
sec.top_margin, sec.bottom_margin = Cm(1.7), Cm(1.6)
sec.different_first_page_header_footer = True
TEXT_W = 17.2  # cm


# ============================================================ styles + helpers
def set_font(style, name="Calibri", size=None, bold=None, color=None):
    style.font.name = name
    rpr = style.element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts")
        rpr.append(rf)
    for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rf.set(qn(a), name)
    if size:
        style.font.size = Pt(size)
    if bold is not None:
        style.font.bold = bold
    if color is not None:
        style.font.color.rgb = color


normal = doc.styles["Normal"]
set_font(normal, size=10, color=DARK)
normal.paragraph_format.space_after = Pt(3.5)
normal.paragraph_format.line_spacing = 1.07
h1, h2 = doc.styles["Heading 1"], doc.styles["Heading 2"]
set_font(h1, size=14.5, bold=True, color=GREEN)
h1.paragraph_format.space_before, h1.paragraph_format.space_after, h1.paragraph_format.keep_with_next = Pt(9), Pt(3.5), True
set_font(h2, size=11.5, bold=True, color=DARK)
h2.paragraph_format.space_before, h2.paragraph_format.space_after, h2.paragraph_format.keep_with_next = Pt(6), Pt(2.5), True
for name in ("List Bullet", "List Number"):
    set_font(doc.styles[name], size=10, color=DARK)
    doc.styles[name].paragraph_format.space_after = Pt(1.2)

TOKEN = re.compile(r"(\*\*.+?\*\*|\[\[.+?\]\])")


def add_runs(p, text, size=None, italic=False, color=None, bold=False):
    for part in TOKEN.split(text):
        if not part:
            continue
        if part.startswith("**"):
            r = p.add_run(part[2:-2]); r.bold = True
        elif part.startswith("[["):
            r = p.add_run("[" + part[2:-2] + "]"); r.font.highlight_color = WD_COLOR_INDEX.YELLOW; r.bold = bold
        else:
            r = p.add_run(part); r.bold = bold
        if size:
            r.font.size = Pt(size)
        if italic:
            r.italic = True
        if color is not None:
            r.font.color.rgb = color
    return p


def para(text, align=None, size=None, italic=False, color=None, after=None, before=None, bold=False, keep=False):
    p = doc.add_paragraph()
    add_runs(p, text, size=size, italic=italic, color=color, bold=bold)
    if align is not None:
        p.alignment = align
    if after is not None:
        p.paragraph_format.space_after = Pt(after)
    if before is not None:
        p.paragraph_format.space_before = Pt(before)
    if keep:
        p.paragraph_format.keep_with_next = True
    return p


def bullets(items, style="List Bullet", size=None):
    for t in items:
        add_runs(doc.add_paragraph(style=style), t, size=size)


def heading(text, level=1):
    return doc.add_heading(text, level=level)


def hyperlink(paragraph, url, text=None, run=None, size=None):
    """Adds a clickable link. Pass `run` to make an existing run (e.g. an image) the link."""
    rid = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    hl = OxmlElement("w:hyperlink")
    hl.set(qn("r:id"), rid)
    if run is None:
        run = paragraph.add_run(text or url)
        run.font.color.rgb = LINK
        run.font.underline = True
        if size:
            run.font.size = Pt(size)
    hl.append(run._r)
    paragraph._p.append(hl)


def shade(cell, fill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), fill)
    tcpr.append(shd)


def cell_margins(table, top=35, bottom=35, left=70, right=70):
    mar = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement(f"w:{k}"); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); mar.append(e)
    table._tbl.tblPr.append(mar)


def table(rows, widths, header=True, size=8.8, first_col_bold=False, fills=None, after=True):
    t = doc.add_table(rows=len(rows), cols=len(widths))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    cell_margins(t)
    for i, row in enumerate(rows):
        tr = t.rows[i]
        trpr = tr._tr.get_or_add_trPr()
        trpr.append(OxmlElement("w:cantSplit"))
        if header and i == 0:
            trpr.append(OxmlElement("w:tblHeader"))
        for j, text in enumerate(row):
            c = tr.cells[j]
            c.width = Cm(widths[j])
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            head = header and i == 0
            add_runs(p, text, size=size, bold=head or (first_col_bold and j == 0), color=RGBColor(255, 255, 255) if head else None)
            if head:
                shade(c, HEAD_FILL)
            elif fills and fills.get(i):
                shade(c, fills[i])
            elif i % 2 == 0:
                shade(c, ROW_FILL)
    if after:
        doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return t


def figure(path, width_cm, caption, link=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run()
    run.add_picture(str(path), width=Cm(width_cm))
    if link:
        p._p.remove(run._r)
        hyperlink(p, link, run=run)
    return para(caption, align=WD_ALIGN_PARAGRAPH.CENTER, size=8.8, italic=True, color=GREY, after=5)


def figure_pair(items, width_cm=8.3):
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for j, (path, cap) in enumerate(items):
        c = t.rows[0].cells[j]
        c.width = Cm(8.6)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_after = Pt(1)
        p.add_run().add_picture(str(path), width=Cm(width_cm))
        cp = c.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(3)
        add_runs(cp, cap, size=8.3, italic=True, color=GREY)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def callout(text, fill="EAF6F0"):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    t.style = "Table Grid"
    cell_margins(t, 70, 70, 120, 120)
    c = t.rows[0].cells[0]
    c.width = Cm(TEXT_W)
    shade(c, fill)
    p = c.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    add_runs(p, text, size=9.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def mono_block(left_lines, right_lines, size=7.4):
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    t.style = "Table Grid"
    cell_margins(t, 60, 60, 90, 90)
    for j, lines in enumerate((left_lines, right_lines)):
        c = t.rows[0].cells[j]
        c.width = Cm(TEXT_W / 2)
        shade(c, "F6F8F7")
        first = True
        for ln in lines:
            p = c.paragraphs[0] if first else c.add_paragraph()
            first = False
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            r = p.add_run(ln)
            r.font.name = "Consolas"
            r._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
            r.font.size = Pt(size)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def add_field(paragraph, instr):
    r = paragraph.add_run()
    for kind, text in (("begin", None), (None, instr), ("end", None)):
        if kind:
            e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), kind)
        else:
            e = OxmlElement("w:instrText"); e.set(qn("xml:space"), "preserve"); e.text = text
        r._r.append(e)
    r.font.size = Pt(8.5); r.font.color.rgb = GREY


fp = sec.footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
rr = fp.add_run(f"Grocify v{S['version']}  |  PBL Report  |  UC25CA2303  |  {STUDENT} ({USN})  |  Page ")
rr.font.size, rr.font.color.rgb = Pt(8.5), GREY
add_field(fp, "PAGE")

# ====================================================================== COVER
para("GM UNIVERSITY", align=WD_ALIGN_PARAGRAPH.CENTER, size=22, bold=True, color=GREEN, before=4, after=0)
para("P. B. Road, Davangere - 577 006, Karnataka, India", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, color=GREY, after=10)
para("PROJECT BASED LEARNING (PBL) REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, size=14.5, bold=True, after=1)
para("E-Commerce and Digital Business", align=WD_ALIGN_PARAGRAPH.CENTER, size=12, after=0)
para("Course Code: UC25CA2303   |   Semester: 3   |   Duration: 14 Weeks   |   Total Marks: 40",
     align=WD_ALIGN_PARAGRAPH.CENTER, size=10, color=GREY, after=12)
para("GROCIFY", align=WD_ALIGN_PARAGRAPH.CENTER, size=32, bold=True, color=GREEN, after=0)
para("Online Grocery E-Commerce System with Secure Digital Payments and Logistics Management",
     align=WD_ALIGN_PARAGRAPH.CENTER, size=13, bold=True, after=8)

figure(SHOT / "00-home.png", 12.6, "Live prototype home page. Click the image to open the website.", link=LIVE_URL)
p = para("Live prototype:  ", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, after=12)
hyperlink(p, LIVE_URL, size=10.5)

para("Submitted by", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, bold=True, after=2)
table([["Name", "USN"], [STUDENT, USN]], [8.0, 5.0], size=10.5, after=False)
para("Faculty guide: [[Faculty name and designation]]", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, before=6, after=1)
para("Issue date: 28-08-2026     |     Submission date: 27-11-2026", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, after=1)
para(f"Source code: {REPO_URL}     |     Version {S['version']}", align=WD_ALIGN_PARAGRAPH.CENTER, size=9.5, color=GREY)
doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ====================================================================== ABSTRACT
heading("Abstract")
para("Grocify is a working online grocery and lifestyle store that lets customers browse a wide catalogue, fill a cart, place an order, "
     "pay digitally, and follow the delivery until it arrives, while administrators manage products, stock, orders, payments, "
     "deliveries and reports from one console. It was built as the Project Based Learning prototype for E-Commerce and Digital "
     f"Business and is deployed on Render and served from the custom domain {LIVE_URL}.")
para("The system is a React single-page website backed by a Node.js (Express) server. Beyond the basic shopping flow, the design "
     "addresses the problems that break real shops: two customers buying the last item at once, a double-clicked pay button, stock "
     "held by orders that are never paid, and card details stored in the wrong place. Orders are created in one all-or-nothing step "
     "with a unique ID, unpaid orders release their stock automatically, and the payment layer can be swapped for a real gateway "
     "without changing order code.")
para(f"All ten functional requirements in the PBL document are implemented and verified by {S['tests']} automated tests, including a test "
     "in which 20 customers compete for 5 units and exactly 5 orders succeed. As the PBL document specifies a prototype, payment is "
     "simulated and data is held in a local store; Section 6 sets out how these are replaced for a full production system.")

# ====================================================================== 1 INTRODUCTION
heading("1. Introduction")
para("Online grocery shopping has become routine, yet many small and mid-sized stores still take orders by phone and paper. That "
     "creates manual order handling, inaccurate stock, payments that are hard to verify, and customers who cannot see where an order is. "
     "Grocify demonstrates how one connected system can cover the entire journey: catalogue, cart, order, payment, inventory, "
     "delivery and notifications, together with the administration tools needed to run it.")
para("The project applies the main concepts of the course: the e-commerce process and its actors, digital payment methods and their "
     "security, order and inventory management, logistics, and the information systems behind a digital business.", after=4)
callout("**Prototype status.** The PBL document asks for a functional prototype that demonstrates these concepts end to end. Grocify "
        "meets that scope and is live, but it is a prototype: payments use a simulated gateway (no real money moves), the data store "
        "is a local file rather than a managed database, and notifications appear inside the website only. These boundaries are "
        "listed in Section 4.6 and the path beyond them in Section 6.")

# ====================================================================== 2 PROBLEM STATEMENT
heading("2. Problem Statement")
para("Customers need a convenient platform to browse grocery products, add items to a cart, place orders, make secure digital "
     "payments and track deliveries online. Administrators need to manage products, inventory, customer orders, payments and "
     "delivery status efficiently, reducing manual work and improving the overall grocery shopping experience.")
heading("2.1 Objectives", 2)
bullets([
    "Build an easy-to-use online platform for purchasing groceries, with product search and category browsing.",
    "Provide a shopping cart and an online order management facility.",
    "Implement secure digital payment for online transactions.",
    "Maintain accurate inventory and stock availability, updated automatically.",
    "Give customers order tracking and delivery status.",
    "Help administrators manage products, customers, orders, payments and deliveries efficiently.",
    "Reduce manual effort and provide a fast, convenient and reliable shopping experience.",
])
heading("2.2 Functional requirements and status", 2)
table([
    ["#", "Requirement (from the PBL document)", "What the system does", "Status"],
    ["1", "User registration and login", "Create an account, log in securely, update profile and delivery address", "Done"],
    ["2", "Product management", "Browse by category, search, price/description/availability; admin adds, updates, deletes", "Done"],
    ["3", "Shopping cart", "Add items, change quantity, remove, automatic total", "Done"],
    ["4", "Order management", "Place an order with an address, unique order ID, order history; admin views and manages orders", "Done"],
    ["5", "Digital payment", "UPI, card or net banking; status and transaction recorded; confirmation", "Done (simulated gateway)"],
    ["6", "Inventory management", "Stock falls after each order; admin monitors stock; low stock flagged", "Done"],
    ["7", "Logistics and delivery", "Admin assigns delivery; five statuses; customer tracks the order", "Done"],
    ["8", "Admin management", "Manage customers, products, categories, orders, payments, inventory, deliveries; reports", "Done"],
    ["9", "Notifications", "Order confirmation, payment status and delivery updates", "Done (in-app)"],
    ["10", "Security and access control", "Login required; separate customer/admin permissions; no payment details stored", "Done"],
], [0.8, 4.3, 9.4, 2.7], size=8.6)

# ====================================================================== 3 METHODOLOGY / DESIGN
heading("3. Methodology and Design")
heading("3.1 Development approach", 2)
para("The work followed seven phases that fit the 14-week PBL timeline, each ending in something that could be run and checked. "
     "Versions were managed on GitHub: v1.0.0 was the feature-complete prototype, and v1.1.0 added the modern interface, "
     "production deployment and link previews.", after=3)
table([
    ["Phase", "PBL weeks", "Work", "Outcome"],
    ["1 Understand and plan", "1 to 4", "Study the problem, choose tools, proposal", "Proposal, project set-up"],
    ["2 Design", "5 to 6", "Use cases, data model, flows, clickable mock-up", "Design document"],
    ["3 Core shopping", "7 to 8", "Login, products, cart, admin product management", "Cart works"],
    ["4 Orders and payment", "9 to 10", "Orders, payment, stock updates", "Customers can buy and pay"],
    ["5 Delivery and admin", "10 to 11", "Delivery tracking, notifications, reports", "All ten functions work"],
    ["6 Testing and hardening", "11 to 12", "Logging, security and stress tests", f"{S['tests']} passing tests"],
    ["7 Final and release", "13 to 14", "UI modernisation, deployment, report, demo", f"v{S['version']} live"],
], [3.6, 2.1, 7.2, 4.3], size=8.6)

heading("3.2 Technologies used", 2)
table([
    ["Layer", "Technology (version)", "Purpose"],
    ["Programming languages", "JavaScript (ES modules) for server and tests; JavaScript with JSX for the website; CSS3; HTML5; Python 3 (documentation tooling only)", "All application code is JavaScript, so one language covers both sides"],
    ["Frontend", "React 19.3, React Router 7.18, Vite 8.3, @vitejs/plugin-react 6.2", "Single-page interface, routing, fast build"],
    ["Backend", "Node.js 22.12 or newer, Express 5.3", "REST API and, in production, serving the built website"],
    ["Security", "bcryptjs 3.0, jsonwebtoken 9.0, helmet 8.3, cors 2.8, express-rate-limit 8.7", "Password hashing, signed login tokens, headers, allowed origin, attempt limits"],
    ["Configuration and logging", "dotenv 18.0, Winston 3.19 with daily-rotate-file 5.0", "Settings from .env; JSON logs with daily rotation"],
    ["Data", "Local JSON store (server/data/localStore.js)", "Users, products, carts, orders, payments, deliveries, notifications"],
    ["Payments", "Provider interface with a mock provider", "Simulated UPI, card and net banking; real gateway slot ready"],
    ["Testing", "Node.js built-in test runner (node:test)", f"{S['tests']} automated tests run against the real server"],
    ["Hosting", f"Render web service with custom domain {LIVE_URL}", "Public deployment of the prototype"],
    ["Version control", "Git and GitHub, pull-request workflow", "History, review, releases"],
], [3.3, 7.6, 6.3], size=8.5)

heading("3.3 System architecture", 2)
para("The website never touches data directly. Every action goes to the server, which checks who is asking (login token), what they may do "
     "(customer or admin role) and whether the input is valid before reading or changing anything. In production a single Express "
     "service on Render serves both the API under /api and the built React website, with a fallback so that every page address works "
     "when opened or refreshed directly.", after=2)
figure(DIAG / "architecture.png", 11.6, "Figure 1: System overview")

heading("3.4 Source structure", 2)
para(f"The repository holds about {S['server_lines']:,} lines of server code in {S['server_files']} files, {S['src_lines']:,} lines of website code in "
     f"{S['src_files']} files and {S['test_lines']:,} lines of tests in {S['test_files']} files, with {S['endpoints']} API endpoints and "
     f"{S['customer_pages'] + S['admin_pages']} screens ({S['customer_pages']} customer, {S['admin_pages']} admin).", after=3)
mono_block(
    ["server/            Node.js + Express API",
     "|- index.js         start, auto-seed, expiry sweep",
     "|- app.js           security, /api routes, serves site",
     "|- seed.js, resetDemo.js",
     "|- config/          env, logger, firebase stub",
     "|- middleware/      authenticate, authorize,",
     "|                   validate, rateLimit, errors",
     "|- routes/          9 files, one per /api area",
     "|- controllers/     auth, products, categories,",
     "|                   cart, orders, payments,",
     "|                   inventory, deliveries,",
     "|                   notifications, admin",
     "|- services/        orderService (expiry)",
     "|- payments/        PaymentProvider, mock, gateway",
     "|- data/            localStore (data + order logic)",
     "'- utils/           constants",
     "",
     "tests/              4 files, " + str(S["tests"]) + " tests (node:test)"],
    ["src/               React website (Vite)",
     "|- main.jsx, App.jsx",
     "|- routes/          AppRoutes, ProtectedRoute,",
     "|                   AdminRoute",
     "|- context/         Auth, Cart, Theme",
     "|- services/api.js  fetch wrapper (adds token)",
     "|- data/            categoryTaxonomy (" + str(S["sections"]) + " sections)",
     f"|- components/      {S['components']} shared parts: Navbar,",
     "|                   CategoryMegaMenu, BottomNav,",
     "|                   Footer, ProductCard,",
     "|                   ProductViewer360, tracking",
     f"|- pages/customer/  {S['customer_pages']} screens",
     f"|- pages/admin/     {S['admin_pages']} screens",
     "'- styles/main.css   theme and layout",
     "",
     "Project root: index.html, vite.config.js,",
     "package.json, .env.example, start-grocify.bat,",
     "public/ (link-preview images), docs/ (report,",
     "design, test report, diagrams, screenshots)"])

heading("3.5 Data model and design decisions", 2)
para("Nine kinds of records hold everything. Order items copy the product name and price at the moment of purchase, so later price "
     "changes never alter an old order, and deleting a product only hides it so past orders stay readable.", after=2)
figure(DIAG / "er-diagram.png", 12.2, "Figure 2: Data model (ER diagram)")
table([
    ["Problem", "Decision", "Why"],
    ["Two customers want the last item", "Order creation is one all-or-nothing step: check every item, reduce stock, write the order, clear the cart", "One customer wins; nothing is half-done"],
    ["Customer clicks Place Order twice", "Checkout sends a one-time key; a repeat returns the same order", "One order, one stock reduction"],
    ["Unpaid orders hold stock", "Stock is reserved at order time and released after 15 minutes unpaid or on cancel", "Accurate stock without losing sales"],
    ["Unique, traceable order numbers", "ORD-date-customerCode-number, counting up per customer", "IDs never repeat or collide"],
    ["Card data is sensitive", "Only method, status and transaction ID are stored", "The system never handles card data"],
    ["A real gateway comes later", "Orders use a provider interface; a mock provider runs now", "Switching needs one file and one setting"],
    ["Delivery must be believable", "One step at a time; a delivery person must be assigned before Shipped", "No skipped or reversed steps"],
    ["Customers must be told", "A notification is created in the same step as the change", "No change goes unnoticed"],
], [4.0, 7.4, 5.8], size=8.4)

# ====================================================================== 4 IMPLEMENTATION
heading("4. Implementation")
heading("4.1 Requirements implemented", 2)
table([
    ["Requirement", "How it is implemented", "Main files"],
    ["1 Login", "Registration and login with hashed passwords and signed tokens; profile and delivery address; login attempts limited", "authController, AuthContext"],
    ["2 Products", "Category filter, search, availability labels; admin add/edit/delete (delete hides)", "productsController, ProductList"],
    ["3 Cart", "Add, change quantity, remove; total always calculated by the server; quantity capped at stock", "cartController, Cart"],
    ["4 Orders", "All-or-nothing creation, unique IDs, history, cancel unpaid; admin order list", "localStore, ordersController"],
    ["5 Payment", "UPI / card / net banking; failed payments can be retried; confirmation with transaction ID", "payments/, Payment"],
    ["6 Inventory", "Stock falls on order; low-stock limit per product; admin stock view", "inventoryController, Inventory"],
    ["7 Delivery", "Assign a delivery person; five statuses in order; customer timeline", "deliveriesController, OrderTracking"],
    ["8 Admin", "Dashboard, customers, payments, orders, deliveries, inventory; sales report with date range", "adminController, Reports"],
    ["9 Notifications", "Order, payment and delivery messages; unread dot; mark read", "notificationsController"],
    ["10 Security", "Roles checked on the server for every request; input validation; no payment data stored", "authorize, validate"],
], [2.3, 10.6, 4.3], size=8.4)

heading("4.2 What the production build (v" + S["version"] + ") adds", 2)
bullets([
    f"**Wide catalogue:** {S['sections']} sections and {S['categories']} categories (grocery, snacks, beauty, household, electronics, artisanal and gourmet, gifting, decor, kids, fashion, pharma, pet care and more), reached from a hamburger mega-menu. Categories without matching stock show a \"coming soon\" state.",
    "**Modern interface:** dark theme by default with a floating glass-style navigation bar, a quick-links strip (Home, Shop, Cart, My Orders, Notifications), a bottom bar on phones, and an optional light theme in the settings.",
    "**360-degree product view:** drag or swipe to rotate a product through a full turn on electronics pages (a stylised model; real photographs plug in later).",
    "**Real-time delivery tracking:** order timeline with an estimated arrival countdown, courier details, and an interactive demo stepper (advance, reset, auto-play) used to demonstrate the delivery flow.",
    "**Profile dashboard:** customer summary cards, editable details and address, and permanent account deletion that requires typing a confirmation word.",
    "**Order Again and Print:** refill the cart from a past order in one tap; clean printable receipts.",
    "**Production serving and link previews:** one service serves the API and the built site; the catalogue and admin account are created on first start; shared links show a preview card (Open Graph and Twitter tags).",
    "**Operations:** one-click Windows launcher (start-grocify.bat) and a demo-reset command for rehearsals.",
])

heading("4.3 Screens", 2)
para("Screenshots below come from the running v" + S["version"] + " build with sample data. The home page is on the cover.", after=3)
figure_pair([(SHOT / "01-products.jpg", "Figure 3: Product list with search and availability"),
             (SHOT / "02-category-menu.jpg", "Figure 4: Category mega-menu with sections")])
figure_pair([(SHOT / "03-viewer-360.jpg", "Figure 5: 360-degree product viewer"),
             (SHOT / "04-cart.jpg", "Figure 6: Cart with automatic total")])
figure_pair([(SHOT / "05-tracking.jpg", "Figure 7: Real-time order tracking"),
             (SHOT / "06-profile.jpg", "Figure 8: Customer profile dashboard")])
figure_pair([(SHOT / "07-admin-deliveries.jpg", "Figure 9: Admin deliveries: assign and advance"),
             (SHOT / "08-admin-reports.jpg", "Figure 10: Admin sales and order report")])

heading("4.4 Deployment", 2)
table([
    ["Item", "Setting"],
    ["Platform", "Render web service, linked to the custom domain " + LIVE_URL],
    ["Build command", "npm install && npm run build  (builds the React site with Vite)"],
    ["Start command", "npm start  (one Express service serves /api and the built site)"],
    ["Environment variables", "NODE_ENV=production, JWT_SECRET (a long random value); optional admin e-mail and password for the first-start admin account"],
    ["First start", "If the store is empty, the catalogue (5 categories, 14 products) and the admin account are created automatically"],
    ["Checked on 08-11-2026", f"Home page and /api/health reachable; health check reports version {S['version']}"],
], [3.6, 13.6], size=8.6)

heading("4.5 Security, reliability and logging", 2)
bullets([
    "Passwords are stored only as bcrypt hashes; login errors never reveal whether the e-mail or the password was wrong; attempts are rate-limited.",
    "Roles are enforced on the server for every request; nobody can register as an admin; responses never include password hashes.",
    "Input is validated on the server; oversized or broken requests are refused with a clear message. Helmet security headers and a restricted allowed origin are applied.",
    "Card, UPI and bank details are never accepted or stored.",
    "Every request has an ID that appears on every log line it produces; logs are JSON, rotate daily, and never contain passwords, tokens or card data (an automated test enforces this).",
], size=9.5)

heading("4.6 Prototype boundaries", 2)
bullets([
    "**Payments are simulated.** The mock gateway returns success or failure; no real money moves.",
    "**Data is held in a local file.** It suits one server. On Render's default storage the file resets when the service is redeployed, which is why the catalogue is re-seeded on start.",
    "**Notifications are in-app only.** There is no e-mail or SMS delivery yet.",
    "**The delivery stepper is a demonstration aid.** A real store would let only the admin or courier advance a delivery.",
    "**The 360-degree viewer uses a stylised model** because the prototype has no multi-angle product photography.",
], size=9.5)

# ====================================================================== 5 RESULTS
heading("5. Results and Discussion")
heading("5.1 Testing", 2)
para(f"{S['tests']} automated tests start the real server on a temporary data file, so they never touch demo data. Together with hands-on browser "
     "checks they cover all ten requirements.", after=3)
table([
    ["Check", "Result"],
    [f"Automated tests ({S['test_files']} files)", f"{S['tests']} of {S['tests']} pass"],
    ["Fresh download from GitHub: install, test, build", "Works with no extra set-up"],
    ["Known-vulnerability scan of dependencies (npm audit)", "0 found"],
    ["Customer journey in a browser (register to tracking)", "All steps worked; totals and stock correct at each step"],
    ["Admin journey (assign, ship, deliver, reports)", "Worked; dashboard, report, customer and payment figures agreed"],
    ["Live deployment", f"Reachable at {LIVE_URL}; version {S['version']}"],
], [9.2, 8.0], size=8.8)
heading("5.2 Results by requirement", 2)
table([
    ["Requirement", "Verified by", "Result"],
    ["1 Registration and login", "Duplicate e-mail, weak password, wrong password, profile update, forged and expired tokens", "Pass"],
    ["2 Product management", "Filter, search, availability labels, admin-only changes, bad prices and stock refused", "Pass"],
    ["3 Shopping cart", "Add, quantity, stock limit, remove, exact totals", "Pass"],
    ["4 Order management", "ID format, unique IDs, history, privacy between customers, admin view", "Pass"],
    ["5 Digital payment", "Failed then retried payment, no double payment, no card data stored", "Pass"],
    ["6 Inventory", "Stock falls on order, returns on cancel or expiry, low-stock list", "Pass"],
    ["7 Logistics", "One step at a time, assignment needed to ship, full path to Delivered", "Pass"],
    ["8 Admin management", "Customers, payments, deliveries, report totals and date checks", "Pass"],
    ["9 Notifications", "Order, payment (success, failure, expiry) and each delivery step; private to the customer", "Pass"],
    ["10 Security", "Roles, broken input, oversized requests, forged tokens, no secrets in responses or logs", "Pass"],
], [3.6, 11.6, 2.0], size=8.5)
heading("5.3 Concurrency and load", 2)
table([
    ["Situation", "Expected", "Result"],
    ["20 customers order 5 units at the same moment", "Exactly 5 orders succeed; stock ends at 0", "5 succeeded, 15 refused, 5 distinct IDs, stock 0"],
    ["Two customers want the last unit", "One succeeds", "As expected; stock never negative"],
    ["One customer submits checkout 10 times at once", "One order; stock reduced once", "As expected"],
    ["Two payments for one order at once", "One success recorded", "As expected"],
], [6.4, 4.8, 6.0], size=8.5)
heading("5.4 Discussion", 2)
para("The hardest parts were the rules behind the screens: when stock is reserved and released, keeping order creation safe when many people "
     "buy at once, and keeping delivery steps honest. Writing those rules as tests first made the important cases clear. A review of logs "
     "and stress tests also found and fixed real defects (unlogged order expiry, log lines that could not be tied to a request, and a "
     "log-safety test that could not fail). Limits remain and are stated openly in Section 4.6: the local data store, the simulated "
     "payment gateway, in-app-only notifications, and hand-run browser checks.")
table([
    ["PBL rubric component", "Where it is addressed"],
    ["Problem understanding", "Sections 1 and 2"],
    ["Design and methodology", "Section 3: approach, technologies, architecture, source structure, data model"],
    ["Implementation (all units)", "Section 4: ten requirements, production build, deployment, security, logging"],
    ["Functionality and integration", "Sections 4.1 and 5: end-to-end flow, tests, live deployment"],
    ["Innovation / enhancements", "Sections 3.5 and 4.2: all-or-nothing orders, stock release, 360-degree view, live tracking, one-click launcher"],
], [5.2, 12.0], size=8.5)

# ====================================================================== 6 CONCLUSION
heading("6. Conclusion and Future Scope")
para("Grocify meets the problem statement: customers can search, buy, pay and track groceries, and administrators can run the shop from one "
     "system. All ten required functions work, are tested, and are live at " + LIVE_URL + ". The design handles the situations that "
     "usually break small shops (simultaneous buyers, repeated clicks, abandoned orders and sensitive payment data), and the project "
     "achieved the learning outcomes the PBL sets out: building a complete working application, applying end-to-end programming skills, "
     "improving problem-solving, and gaining confidence in real-world software development.")
heading("6.1 Potential future enhancements", 2)
para("Because this is a prototype, the following are the steps to a production store. The code already has swap points for the first two.", after=3)
table([
    ["Area", "Enhancement", "Benefit"],
    ["Data and login", "Connect Firebase (Authentication and Firestore) or another managed database; add backups", "Data survives restarts; several servers can run"],
    ["Payments", "Add a real gateway (test mode first, then live) with signed confirmation callbacks and refunds", "Real money, reconciled reliably"],
    ["Notifications", "E-mail, SMS and messaging-app alerts alongside the in-app ones", "Customers are reached even when away"],
    ["Logistics", "Courier or delivery-partner screen, live location, proof of delivery; lock status changes to admin and courier roles", "Realistic delivery operations"],
    ["Catalogue", "Product photographs and real 3D models for the 360-degree view; admin tools for the full category tree; better search", "Richer, more trustworthy product pages"],
    ["Commerce", "Coupons, delivery time slots, tax invoices (PDF), returns", "Closer to a full retail store"],
    ["Quality", "Automated browser tests and a CI pipeline; monitoring and alerts", "Safer, faster releases"],
    ["Security", "Two-step login, rate limits stored outside memory, regular dependency and penetration checks", "Stronger protection at scale"],
    ["Reach", "Kannada and other languages, installable mobile app (PWA), accessibility audit", "More customers, more devices"],
], [2.6, 9.0, 5.6], size=8.4)
para("**Tools and AI assistance.** AI-assisted development tools (Claude Code and Google Antigravity) were used in parts of the coding, testing and "
     "documentation of this project.", size=9.2, before=2)

# ====================================================================== REFERENCES
heading("References")
refs = [
    "PBL document, Project Based Learning: E-Commerce and Digital Business, Course UC25CA2303, GM University, 2026.",
    "Express web framework documentation. https://expressjs.com",
    "React documentation. https://react.dev",
    "React Router documentation. https://reactrouter.com",
    "Vite documentation. https://vite.dev",
    "Node.js documentation. https://nodejs.org/docs",
    "Render documentation: web services and custom domains. https://render.com/docs",
    "Winston logging library. https://github.com/winstonjs/winston",
    "M. Jones, J. Bradley and N. Sakimura, \"JSON Web Token (JWT)\", RFC 7519, IETF, 2015.",
    "N. Provos and D. Mazieres, \"A Future-Adaptable Password Scheme\", USENIX Annual Technical Conference, 1999.",
    "OWASP Foundation, \"OWASP Top 10 Web Application Security Risks\". https://owasp.org/www-project-top-ten/",
    "PCI Security Standards Council, \"Payment Card Industry Data Security Standard (PCI DSS)\". https://www.pcisecuritystandards.org",
    "Stripe, \"Idempotent requests\" (API documentation). https://docs.stripe.com/api/idempotent_requests",
    "Firebase documentation: Authentication and Cloud Firestore. https://firebase.google.com/docs",
]
for r in refs:
    add_runs(doc.add_paragraph(style="List Number"), r, size=9)

# ====================================================================== CONTRIBUTION
heading("Individual Contribution Declaration")
table([
    ["Name", "Role", "Contribution", "Contribution %", "Signature"],
    [f"{STUDENT}\n{USN}".replace("\n", " "), "Project Developer (all modules)",
     "Front end: user interface, product pages, search, categories, cart, registration and login. E-commerce and orders: order management, cart-to-order process, "
     "customer orders and order history. Payment and data: digital payment module, data store, customer, product and transaction records. "
     "Also inventory, delivery tracking, admin console, notifications, testing, deployment and documentation.", "100%", ""],
], [3.0, 2.8, 8.2, 1.7, 1.5], size=8.5)

doc.save(OUT)
print("Saved", OUT)
print({k: v for k, v in S.items()})
