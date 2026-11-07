"""Builds docs/Grocify-Project-Report.docx (the PBL project report).

Run from the project folder:  python docs/report/build_report.py
Yellow-highlighted [[...]] text marks details only the team knows (names, USNs, faculty).
Edit the text below and run again, or edit the Word file directly.
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT  # noqa: F401
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
DIAG = ROOT / "docs" / "diagrams"
SHOT = ROOT / "docs" / "screenshots"
OUT = ROOT / "docs" / "Grocify-Project-Report.docx"

GREEN = RGBColor(0x2E, 0x7D, 0x32)
DARK = RGBColor(0x22, 0x22, 0x22)
GREY = RGBColor(0x55, 0x55, 0x55)

doc = Document()

# ------------------------------------------------------------------ page + styles
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.0)
sec.top_margin, sec.bottom_margin = Cm(1.9), Cm(1.8)
sec.different_first_page_header_footer = True


def set_font(style, name="Calibri", size=None, bold=None, color=None):
    style.font.name = name
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for a in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(a), name)
    if size:
        style.font.size = Pt(size)
    if bold is not None:
        style.font.bold = bold
    if color is not None:
        style.font.color.rgb = color


normal = doc.styles["Normal"]
set_font(normal, size=10.5, color=DARK)
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.08

h1 = doc.styles["Heading 1"]
set_font(h1, size=15, bold=True, color=GREEN)
h1.paragraph_format.space_before, h1.paragraph_format.space_after, h1.paragraph_format.keep_with_next = Pt(10), Pt(4), True
h2 = doc.styles["Heading 2"]
set_font(h2, size=12, bold=True, color=DARK)
h2.paragraph_format.space_before, h2.paragraph_format.space_after, h2.paragraph_format.keep_with_next = Pt(7), Pt(3), True
for name in ("List Bullet", "List Number"):
    set_font(doc.styles[name], size=10.5, color=DARK)
    doc.styles[name].paragraph_format.space_after = Pt(1.5)

TOKEN = re.compile(r"(\*\*.+?\*\*|\[\[.+?\]\])")


def add_runs(p, text, size=None, italic=False, color=None, bold=False):
    """Supports **bold** and [[yellow placeholder]] inside text."""
    for part in TOKEN.split(text):
        if not part:
            continue
        if part.startswith("**"):
            r = p.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("[["):
            r = p.add_run("[" + part[2:-2] + "]")
            r.font.highlight_color = WD_COLOR_INDEX.YELLOW
            r.bold = bold
        else:
            r = p.add_run(part)
            r.bold = bold
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
    if align:
        p.alignment = align
    if after is not None:
        p.paragraph_format.space_after = Pt(after)
    if before is not None:
        p.paragraph_format.space_before = Pt(before)
    if keep:
        p.paragraph_format.keep_with_next = True
    return p


def bullets(items, style="List Bullet"):
    for t in items:
        add_runs(doc.add_paragraph(style=style), t)


def heading(text, level=1):
    return doc.add_heading(text, level=level)


def shade(cell, fill):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tcpr.append(shd)


def cell_margins(table, top=40, bottom=40, left=70, right=70):
    tblpr = table._tbl.tblPr
    mar = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement(f"w:{k}")
        e.set(qn("w:w"), str(v))
        e.set(qn("w:type"), "dxa")
        mar.append(e)
    tblpr.append(mar)


def table(rows, widths, header=True, size=9, first_col_bold=False, fills=None):
    t = doc.add_table(rows=len(rows), cols=len(widths))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    cell_margins(t)
    for i, row in enumerate(rows):
        tr = t.rows[i]
        trpr = tr._tr.get_or_add_trPr()
        cs = OxmlElement("w:cantSplit")
        trpr.append(cs)
        if header and i == 0:
            th = OxmlElement("w:tblHeader")
            trpr.append(th)
        for j, text in enumerate(row):
            c = tr.cells[j]
            c.width = Cm(widths[j])
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            is_head = header and i == 0
            add_runs(p, text, size=size, bold=is_head or (first_col_bold and j == 0), color=RGBColor(255, 255, 255) if is_head else None)
            if is_head:
                shade(c, "2E7D32")
            elif fills and fills.get(i):
                shade(c, fills[i])
            elif i % 2 == 0:
                shade(c, "F4F9F4")
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


def figure(path, width_cm, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(str(path), width=Cm(width_cm))
    c = para(caption, align=WD_ALIGN_PARAGRAPH.CENTER, size=9, italic=True, color=GREY, after=6)
    return c


def figure_pair(items, width_cm=8.2):
    """items = [(path, caption), (path, caption)] shown side by side."""
    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for j, (path, cap) in enumerate(items):
        c = t.rows[0].cells[j]
        c.width = Cm(8.5)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_after = Pt(1)
        p.add_run().add_picture(str(path), width=Cm(width_cm))
        cp = c.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_after = Pt(4)
        add_runs(cp, cap, size=8.5, italic=True, color=GREY)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_field(paragraph, instr):
    r = paragraph.add_run()
    for kind, text in (("begin", None), (None, instr), ("end", None)):
        if kind:
            e = OxmlElement("w:fldChar")
            e.set(qn("w:fldCharType"), kind)
        else:
            e = OxmlElement("w:instrText")
            e.set(qn("xml:space"), "preserve")
            e.text = text
        r._r.append(e)
    r.font.size = Pt(8.5)
    r.font.color.rgb = GREY


# footer with page number (not on the cover page)
fp = sec.footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
rr = fp.add_run("Grocify: PBL Project Report  |  UC25CA2303  |  Page ")
rr.font.size, rr.font.color.rgb = Pt(8.5), GREY
add_field(fp, "PAGE")

# ====================================================================== COVER PAGE
para("GM UNIVERSITY", align=WD_ALIGN_PARAGRAPH.CENTER, size=22, bold=True, color=GREEN, before=20, after=0)
para("P. B. Road, Davangere - 577 006, Karnataka, India", align=WD_ALIGN_PARAGRAPH.CENTER, size=10.5, color=GREY, after=2)
para("[[Programme / Department]]", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, after=26)
para("PROJECT BASED LEARNING (PBL) REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, size=15, bold=True, after=3)
para("E-Commerce and Digital Business", align=WD_ALIGN_PARAGRAPH.CENTER, size=12.5, after=0)
para("Course Code: UC25CA2303   |   Semester: 3", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, color=GREY, after=34)
para("GROCIFY", align=WD_ALIGN_PARAGRAPH.CENTER, size=34, bold=True, color=GREEN, after=2)
para("Online Grocery E-Commerce System with Secure Digital Payments and Logistics Management",
     align=WD_ALIGN_PARAGRAPH.CENTER, size=14, bold=True, after=38)

para("Submitted by", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, bold=True, after=3)
table([
    ["Name", "USN", "Role"],
    ["[[Student 1 name]]", "[[USN]]", "Front-End Developer"],
    ["[[Student 2 name]]", "[[USN]]", "E-Commerce & Order Developer"],
    ["[[Student 3 name]]", "[[USN]]", "Payment & Database Developer"],
    ["[[Student 4 name, if any]]", "[[USN]]", "[[Role]]"],
], [6.2, 4.0, 6.0], size=10)
para("Under the guidance of: [[Faculty name and designation]]", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, before=6, after=2)
para("Submission date: 27-11-2026", align=WD_ALIGN_PARAGRAPH.CENTER, size=11, after=2)
para("Source code: github.com/Aniket886/Grocify", align=WD_ALIGN_PARAGRAPH.CENTER, size=10, color=GREY)
doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

# ====================================================================== ABSTRACT
heading("Abstract")
para("Grocify is a working online grocery store with secure digital payments and delivery tracking. Customers register, "
     "browse groceries by category or search, fill a cart, place an order with a delivery address, pay by UPI, card or "
     "net banking, and follow the order until it is delivered. Administrators manage products, categories, customers, "
     "orders, payments, stock and deliveries from one place, and read sales and order reports.")
para("The system is a React website talking to a Node.js (Express) server. Beyond the basic shopping flow, the design focuses "
     "on the problems that make a real shop fail: two customers buying the last item at the same moment, a customer "
     "clicking the pay button twice, stock held by orders that are never paid, and card details ending up in the wrong "
     "place. Orders are created in a single all-or-nothing step with a unique ID, unpaid orders release their stock "
     "automatically, the payment layer can be swapped for a real gateway without touching order code, and no card or "
     "UPI details are ever stored.")
para("All ten required functions work and are covered by 44 automated tests, including a test in which 20 customers race "
     "for 5 units and exactly 5 orders succeed. The prototype uses a local data store and a mock payment gateway; "
     "connecting Firebase and a real gateway are prepared next steps.")

# ====================================================================== INTRODUCTION
heading("1. Introduction")
para("Buying groceries online has become routine, yet many small and mid-sized grocers still take orders by phone and "
     "paper. That creates the problems this project addresses: manual order handling, wrong stock counts, payments "
     "that are hard to verify, and customers who cannot tell where their order is.")
para("Grocify shows how a complete, dependable grocery e-commerce system can be built as a single connected product. "
     "It covers the whole journey: catalogue, cart, order, payment, inventory, delivery and notifications, together with "
     "the administration tools needed to run it. The project applies the concepts of the course: the e-commerce "
     "process and its actors, digital payment methods and their security, order and inventory management, logistics, "
     "and the information systems behind a digital business.")
para("**Scope.** Grocify is a working prototype for demonstration. It runs locally with sample data. Real money does not "
     "move (the payment gateway is simulated), and the database is a local file; both are designed to be replaced "
     "(Section 3 and Section 6).", after=2)

# ====================================================================== PROBLEM STATEMENT
heading("2. Problem Statement")
para("Customers need a convenient platform to browse grocery products, add items to a cart, place orders, make secure "
     "digital payments and track deliveries online. Administrators need to manage products, inventory, customer orders, "
     "payments and delivery status efficiently, reducing manual work and improving the shopping experience.")
heading("2.1 Objectives", 2)
bullets([
    "Build an easy-to-use online platform for buying groceries, with search and category browsing.",
    "Provide a shopping cart and an online order management facility.",
    "Implement secure digital payment for online transactions.",
    "Maintain accurate inventory and stock availability, updated automatically.",
    "Give customers order status and delivery tracking.",
    "Help administrators manage products, customers, orders, payments and deliveries efficiently.",
    "Reduce manual effort and give a fast, convenient and reliable shopping experience.",
])
heading("2.2 Functional requirements", 2)
para("The system must include the ten functions below. Each one is implemented and tested.", after=3)
table([
    ["#", "Requirement", "What the system does"],
    ["1", "User registration and login", "Create an account, log in securely, update profile and delivery address"],
    ["2", "Product management", "View by category, search, price/description/availability; admin adds, updates, deletes"],
    ["3", "Shopping cart", "Add items, change quantity, remove, automatic total"],
    ["4", "Order management", "Place an order with an address, unique order ID, history; admin views and manages orders"],
    ["5", "Digital payment", "UPI, card or net banking; status and transaction recorded; payment confirmation"],
    ["6", "Inventory management", "Stock updates after each order; admin monitors stock; low stock is flagged"],
    ["7", "Logistics and delivery", "Admin assigns delivery; five delivery statuses; customer tracks the order"],
    ["8", "Admin management", "Manage customers, products, categories, orders, payments, inventory, deliveries; reports"],
    ["9", "Notifications", "Order confirmation, payment status and delivery updates"],
    ["10", "Security and access control", "Login required; separate customer and admin permissions; no payment details stored"],
], [0.9, 4.6, 11.5], size=9)

# ====================================================================== METHODOLOGY / DESIGN
heading("3. Methodology and Design")
heading("3.1 Approach", 2)
para("The work followed seven phases that fit the 14-week PBL timeline. Each phase ended with something that could be run "
     "and checked. From Phase 5 onward every change was reviewed and merged through a GitHub pull request.", after=3)
table([
    ["Phase", "PBL weeks (plan)", "Work", "Outcome"],
    ["1. Understand and plan", "1 to 4", "Study the problem, choose roles and tools, proposal", "Proposal, project set-up"],
    ["2. Design", "5 to 6", "Use cases, data model, flows, clickable mock-up", "Design document, mock-up"],
    ["3. Core shopping", "7 to 8", "Login, products, cart, admin product management", "Customers can fill a cart"],
    ["4. Orders and payment", "9 to 10", "Orders, payment, stock updates", "Customers can buy and pay"],
    ["5. Delivery and admin", "10 to 11", "Delivery tracking, notifications, reports", "All ten functions work"],
    ["6. Testing and hardening", "11 to 12", "Logging, security and stress tests, polish", "44 passing tests"],
    ["7. Final", "13 to 14", "Final build, report, demonstration", "This report, live demo"],
], [3.5, 2.6, 6.6, 4.3], size=8.8)

heading("3.2 Technology", 2)
table([
    ["Layer", "Choice", "Why"],
    ["Website", "React with Vite", "Interactive pages that update without reloading; fast development"],
    ["Server", "Node.js with Express", "One language end to end; simple, widely used web framework"],
    ["Data", "Local JSON store now; Firebase planned", "Runs anywhere for the demo; the same functions can be re-written for Firestore"],
    ["Login", "bcrypt password hashes and signed tokens", "Passwords are never stored in plain text; tokens carry the login"],
    ["Payment", "Swappable provider (mock now)", "A real gateway can be added without changing order code"],
    ["Logging", "Winston with daily rotating files", "Searchable JSON logs, kept for 14 days"],
    ["Testing", "Node's built-in test runner", "No extra tools; tests run the real server"],
], [2.6, 5.2, 9.2], size=9)

heading("3.3 Architecture", 2)
para("The website never touches the data directly. Every action goes through the server, which checks who is asking "
     "(login token), what they are allowed to do (customer or admin role), and whether the input is valid, before "
     "reading or changing data. This is why hiding a button in the website is not what protects the system: the server "
     "refuses forbidden actions even if someone sends the request by hand.", after=2)
figure(DIAG / "architecture.png", 12.2, "Figure 1: System overview")

heading("3.4 Data model", 2)
para("Nine kinds of records hold everything. Two choices matter. Order items **copy the product name and price** at the "
     "moment of purchase, so changing a price later never alters an old order. Deleting a product only **hides** it, so "
     "old orders still show what was bought.", after=2)
figure(DIAG / "er-diagram.png", 12.6, "Figure 2: Data model (ER diagram)")

heading("3.5 Order and payment flow", 2)
figure(DIAG / "order-flow.png", 11.6, "Figure 3: From browsing to delivery")
para("**Key design decisions**", after=2, keep=True)
table([
    ["Problem", "Decision", "Why"],
    ["Two customers want the last item", "Order creation is one all-or-nothing step: check every item, reduce stock, write the order, clear the cart", "Nothing is half-done; one customer wins and the other is told the item is gone"],
    ["Customer clicks Place Order twice", "The checkout page sends a one-time key; a repeat returns the same order", "One order and one stock reduction, never two"],
    ["Unpaid orders hold stock", "Stock is reserved at order time and released if unpaid after 15 minutes or cancelled", "Stock stays accurate without losing sales to abandoned orders"],
    ["Unique, traceable order numbers", "ORD-date-customerCode-number; the number counts up per customer", "IDs never repeat and never collide between customers"],
    ["Card details are sensitive", "Only the method, status and transaction ID are stored; no card or UPI details are accepted", "Meets the requirement and means the system never handles card data itself"],
    ["A real gateway comes later", "Orders talk to a provider interface; a mock provider is used now", "Switching providers needs one file and one setting"],
    ["Delivery must be believable", "Statuses move one step at a time; a delivery person must be assigned before Shipped", "No skipped or reversed steps; every step has a time"],
    ["Customers must be told", "A notification is created in the same step as the change it describes", "No change can happen without the customer being told"],
], [4.0, 7.0, 6.0], size=8.6)

# ====================================================================== IMPLEMENTATION
heading("4. Implementation")
heading("4.1 Modules", 2)
table([
    ["Requirement", "How it is implemented", "Main files"],
    ["1 Login", "Registration and login with hashed passwords and signed tokens; profile with delivery address; login attempts are rate-limited", "authController, authenticate"],
    ["2 Products", "Category filter and search; availability labels (in stock, low, out); admin forms; hidden-not-deleted products", "productsController, ProductList"],
    ["3 Cart", "Add, change quantity, remove; total always calculated by the server; quantity capped at stock", "cartController, Cart"],
    ["4 Orders", "Atomic order creation, unique IDs, history, cancel unpaid; admin order list with filter", "localStore, ordersController"],
    ["5 Payment", "UPI / card / net banking; failed payments can be retried; confirmation with transaction ID", "payments/, Payment"],
    ["6 Inventory", "Stock falls when an order is placed; low-stock limit per product; admin stock view and filter", "inventoryController, Inventory"],
    ["7 Delivery", "Assign a delivery person; five statuses in order; customer timeline with times", "deliveriesController, OrderTracking"],
    ["8 Admin", "Dashboard, customers, payments, orders, deliveries, inventory; sales report with date range", "adminController, Reports"],
    ["9 Notifications", "Order, payment and delivery messages; unread count; mark read", "notificationsController"],
    ["10 Security", "Login required; role checked on the server for every admin action; input validation; no payment data stored", "authorize, validate"],
], [2.4, 10.3, 4.3], size=8.6)

heading("4.2 Screens", 2)
para("The website has 23 screens (14 customer, 9 admin). The main ones follow, using sample data.", after=3)
figure_pair([(SHOT / "01-products.jpg", "Figure 4: Product list with category filter, search and availability"),
             (SHOT / "02-cart.jpg", "Figure 5: Cart with quantity controls and automatic total")])
figure_pair([(SHOT / "03-payment.jpg", "Figure 6: Payment step (test mode, no real money)"),
             (SHOT / "04-confirmation.jpg", "Figure 7: Payment confirmation with transaction ID")])
figure_pair([(SHOT / "05-tracking.jpg", "Figure 8: Customer order tracking timeline"),
             (SHOT / "07-admin-deliveries.jpg", "Figure 9: Admin deliveries: assign and advance")])
figure_pair([(SHOT / "08-admin-inventory.jpg", "Figure 10: Inventory with low-stock highlighting"),
             (SHOT / "09-admin-reports.jpg", "Figure 11: Sales and order report")])

heading("4.3 Security and access control", 2)
bullets([
    "**Passwords** are stored only as bcrypt hashes. Login errors never say whether the email or the password was wrong.",
    "**Roles** are checked on the server for every request. Nobody can register as an admin, and a customer who opens an admin address is turned away.",
    "**Input** is validated on the server (text length, numbers, dates). Oversized or broken requests are refused with a clear message, never a crash.",
    "**Responses** never include password hashes. The server sends security headers and limits login attempts (30 per 15 minutes).",
    "**Payments**: card, UPI and bank details are never accepted or stored; only the method, result and transaction ID are kept.",
])
heading("4.4 Logging and traceability", 2)
para("Every request gets an ID that appears in the response and on every log line it produces, so a problem can be followed "
     "from the screen to the log. Logs are JSON, written to daily files (14 days kept), and record orders, payments, stock "
     "changes, low stock, delivery steps, admin actions, refused access and errors. Passwords, tokens, card data and request "
     "bodies are never logged, and an automated test fails if anyone adds them.")
heading("4.5 Enhancements beyond the basic requirements", 2)
bullets([
    "Double-click-safe checkout and all-or-nothing order creation (tested with a 20-customer race).",
    "Automatic stock release for unpaid orders, so abandoned carts do not block sales.",
    "Payment layer that can be switched to a real gateway through one setting.",
    "Request-ID logging with safe, rotating log files.",
    "Sales report with date range, top products and revenue counted on paid orders only.",
])
para("Size: about 1,200 lines of server code, 1,300 lines of website code and 700 lines of tests; about 35 server "
     "endpoints.", size=9.5, color=GREY, before=2)

# ====================================================================== RESULTS
heading("5. Results and Discussion")
heading("5.1 Testing", 2)
para("Testing used 44 automated tests that start the real server on a temporary data file, plus hands-on checks in a "
     "browser. Together they cover all ten requirements.", after=3)
table([
    ["Check", "Result"],
    ["Automated tests (4 files)", "44 of 44 pass"],
    ["Fresh download from GitHub: install, test, build", "Works, with no extra set-up"],
    ["Known-vulnerability scan of dependencies", "0 found"],
    ["Customer journey in a browser (register to tracking)", "All steps worked; totals and stock correct at every step"],
    ["Admin journey (assign, ship, deliver, reports)", "Worked; dashboard, report, customer and payment figures agreed"],
    ["Phone-width layout (16 pages at 375 px)", "No page overflows"],
], [9.5, 7.5], size=9)

heading("5.2 Results by requirement", 2)
table([
    ["Requirement", "Verified by", "Result"],
    ["1 Registration and login", "Duplicate email, weak password, wrong password, profile update, forged and expired tokens", "Pass"],
    ["2 Product management", "Category filter, search, availability labels, admin-only changes, bad prices and stock refused", "Pass"],
    ["3 Shopping cart", "Add, quantity, stock limit, remove, exact totals (3 x 0.10 = 0.30)", "Pass"],
    ["4 Order management", "ID format, unique IDs, history, privacy between customers, admin view", "Pass"],
    ["5 Digital payment", "Failed then retried payment, no double payment, no card data stored", "Pass"],
    ["6 Inventory", "Stock falls on order, returns on cancel or expiry, low-stock list", "Pass"],
    ["7 Logistics", "One step at a time, assignment needed to ship, full path to Delivered", "Pass"],
    ["8 Admin management", "Customers, payments, deliveries, report totals and date checks", "Pass"],
    ["9 Notifications", "Order, payment (success, failure, expiry) and each delivery step; private to the customer", "Pass"],
    ["10 Security", "Roles, broken input, oversized requests, forged tokens, no secrets in responses or logs", "Pass"],
], [3.6, 11.4, 2.0], size=8.8)

heading("5.3 Concurrency and load", 2)
table([
    ["Situation", "Expected", "Result"],
    ["20 customers order 5 units at the same moment", "Exactly 5 orders succeed, stock ends at 0", "5 succeeded, 15 refused, 5 distinct IDs, stock 0"],
    ["Two customers want the last unit", "One succeeds, one is refused", "As expected; stock never negative"],
    ["One customer submits checkout 10 times at once", "One order, stock reduced once", "One order; stock reduced once"],
    ["Two payments for one order at the same time", "One success recorded", "As expected"],
    ["Same order cancelled twice at once", "Stock restored once", "As expected"],
], [6.2, 5.0, 5.8], size=8.8)

heading("5.4 Problems found and fixed", 2)
para("A review of the logs and the stress tests found real defects, which were fixed and re-tested:", after=2)
bullets([
    "Orders that expired during normal use were never written to the log; all expiry now goes through one logged function.",
    "Log lines could not be tied to a request; every request now has an ID shown on all its lines.",
    "\"Access denied\" log lines recorded the wrong address; they now show the real one.",
    "A first version of the log-safety test could not fail; it was rewritten and proven to fail on a deliberately bad log line.",
    "A crashing screen showed a blank page and unknown addresses showed bare text; there is now an error screen and a proper \"Page not found\" page.",
])
heading("5.5 Discussion", 2)
para("The hardest parts were not the screens but the rules behind them: deciding when stock is reserved and released, "
     "making order creation safe when many people buy at once, and keeping the delivery steps honest. Writing the rules "
     "as tests first made it clear which cases mattered. Limits remain and are stated openly: the data store is a local "
     "file (fine for one server, not for many), payment is simulated, notifications appear inside the website only, and "
     "the browser checks were done by hand rather than by an automated browser test.")

# ====================================================================== CONCLUSION
heading("6. Conclusion and Future Scope")
para("Grocify meets the problem statement: customers can search, buy, pay and track groceries, and administrators can run the "
     "shop from one system. All ten required functions work and are tested, and the design handles the cases that usually "
     "break small shops: simultaneous buyers, repeated clicks, abandoned orders and sensitive payment data. The project "
     "also showed that clear rules and automated tests matter as much as the screens.")
para("**Future scope**", after=2, keep=True)
bullets([
    "Connect Firebase (login and database) using the prepared swap points, so more than one server can run.",
    "Add a real payment gateway in test mode first, then live, with signed confirmation callbacks.",
    "Send notifications by email, SMS or messaging apps as well as inside the website.",
    "Delivery partner screen and live status updates; PDF invoices with tax details.",
    "Product photos, coupons, delivery time slots, and automated browser tests in a build pipeline.",
])
para("**Tools and AI assistance.** Parts of the code, tests and documentation were produced with the help of an AI coding "
     "assistant (Claude Code by Anthropic) working under the team's direction. [[Confirm this statement matches the "
     "university's policy on AI assistance, and edit or remove it as required.]]", size=9.5, before=3)

# ====================================================================== REFERENCES
heading("References")
refs = [
    "Express web framework documentation. https://expressjs.com",
    "React documentation. https://react.dev",
    "Node.js documentation. https://nodejs.org/docs",
    "Vite documentation. https://vite.dev",
    "Winston logging library. https://github.com/winstonjs/winston",
    "M. Jones, J. Bradley and N. Sakimura, \"JSON Web Token (JWT)\", RFC 7519, IETF, 2015.",
    "N. Provos and D. Mazieres, \"A Future-Adaptable Password Scheme\", USENIX Annual Technical Conference, 1999.",
    "OWASP Foundation, \"OWASP Top 10 Web Application Security Risks\". https://owasp.org/www-project-top-ten/",
    "PCI Security Standards Council, \"Payment Card Industry Data Security Standard (PCI DSS)\". https://www.pcisecuritystandards.org",
    "Stripe, \"Idempotent requests\" (API documentation). https://docs.stripe.com/api/idempotent_requests",
    "Firebase documentation: Authentication and Cloud Firestore. https://firebase.google.com/docs",
    "[[Prescribed textbook or notes for E-Commerce and Digital Business]]",
]
for r in refs:
    p = doc.add_paragraph(style="List Number")
    add_runs(p, r, size=9.5)

# ====================================================================== CONTRIBUTION TABLE
heading("Individual Contribution Declaration")
table([
    ["Name", "Role", "Contribution", "%", "Signature"],
    ["[[Student 1]]", "Front-End Developer", "Develops the user interface, product pages, product search, categories, shopping cart, and customer registration/login.", "25%", ""],
    ["[[Student 2]]", "E-Commerce & Order Developer", "Develops order management, cart-to-order process, customer orders, and order history.", "25%", ""],
    ["[[Student 3]]", "Payment & Database Developer", "Implements digital payment module, database management, customer data, product data, and transaction records.", "25%", ""],
    ["[[Student 4, if any]]", "[[Role]]", "[[Contribution, for example delivery, admin, notifications, testing and documentation]]", "25%", ""],
], [3.0, 3.4, 7.4, 1.2, 2.0], size=8.6)
para("Edit this table so it states what each member actually did. Percentages must add up to 100%. "
     "If the group has three members, delete the last row and adjust the percentages.", size=8.5, italic=True, color=GREY)

doc.save(OUT)
print("Saved", OUT)
