"""Draws the three diagrams used in the project report.

Run from the project folder:  python docs/diagrams/make_diagrams.py
Outputs: docs/diagrams/architecture.png, er-diagram.png, order-flow.png
Edit the text or positions below and run again to update them.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon

OUT = Path(__file__).parent
GREEN, GREEN_L, GREY, BLUE_L, ORANGE_L, RED = "#2e7d32", "#e8f5e9", "#555555", "#e3f2fd", "#fff3e0", "#c62828"
DPI = 220


def canvas(w, h, xlim=(0, 100), ylim=(0, 100)):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.axis("off")
    return fig, ax


def box(ax, x, y, w, h, text, fc=GREEN_L, ec=GREEN, fs=7, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.2", fc=fc, ec=ec, lw=1.1))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, fontweight="bold" if bold else "normal", linespacing=1.3)


def diamond(ax, cx, cy, w, h, text, fs=6.6):
    ax.add_patch(Polygon([(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)], closed=True, fc=ORANGE_L, ec="#ef6c00", lw=1.1))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, linespacing=1.25)


def arrow(ax, p1, p2, label=None, color=GREY, loff=(0, 1.2), fs=6.3):
    ax.annotate("", xy=p2, xytext=p1, arrowprops=dict(arrowstyle="-|>", color=color, lw=1.1, shrinkA=0, shrinkB=0))
    if label:
        ax.text((p1[0] + p2[0]) / 2 + loff[0], (p1[1] + p2[1]) / 2 + loff[1], label, ha="center", va="center", fontsize=fs, color=color)


# ---------------------------------------------------------------- architecture
def architecture():
    fig, ax = canvas(6.5, 3.7, ylim=(0, 58))
    box(ax, 1, 24, 20, 22, "Browser\n\nReact website\n(Vite)\n\nCustomer screens\nAdmin screens", fc=BLUE_L, ec="#1565c0")
    box(ax, 36, 14, 30, 36,
        "Express API (Node.js)\n\nRequest ID + logging\nLogin token check\nRole check\n(customer / admin)\nInput validation,\nrate limit\n\nRoutes > Controllers\n> Services", fc=GREEN_L)
    box(ax, 81, 24, 18, 22, "Data store\n\nusers, products,\norders, payments,\ndeliveries,\nnotifications\n\nLocal file now,\nFirebase later", fc=ORANGE_L, ec="#ef6c00", fs=6.5)
    box(ax, 36, 1, 14, 8.5, "Payment provider\nmock now, real\ngateway later", fc="#f3e5f5", ec="#7b1fa2", fs=5.8)
    box(ax, 52, 1, 14, 8.5, "Log files\ndaily rotation\n14 days", fc="#eceff1", ec="#546e7a", fs=6.0)
    arrow(ax, (21.8, 38), (35.2, 38), "JSON over HTTP", loff=(0, 2.3), fs=5.8)
    arrow(ax, (35.2, 31), (21.8, 31))
    arrow(ax, (66.8, 38), (80.2, 38), "read / write", loff=(0, 2.3), fs=5.8)
    arrow(ax, (80.2, 31), (66.8, 31))
    arrow(ax, (43, 13.5), (43, 10))
    arrow(ax, (59, 13.5), (59, 10))
    ax.text(50, 54.5, "Grocify: system overview", ha="center", fontsize=8, fontweight="bold")
    fig.savefig(OUT / "architecture.png", dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------- ER diagram
ENTITIES = {
    "USERS": ["id (PK)", "name, email, phone", "role (customer/admin)", "address", "customerCode", "orderSeq"],
    "ORDERS": ["id (PK)", "userId (FK)", "total, status", "address", "createdAt, expiresAt"],
    "ORDER ITEMS": ["orderId (FK)", "productId (FK)", "name, price (copied)", "quantity"],
    "PRODUCTS": ["id (PK)", "categoryId (FK)", "name, description", "price, stock", "lowStockLimit"],
    "CART ITEMS": ["userId (FK)", "productId (FK)", "quantity"],
    "PAYMENTS": ["id (PK)", "orderId (FK)", "method, status", "transactionId", "amount"],
    "DELIVERIES": ["orderId (FK)", "assignedTo", "status", "history (steps, times)"],
    "CATEGORIES": ["id (PK)", "name"],
    "NOTIFICATIONS": ["id (PK)", "userId (FK)", "type, message", "read"],
}
W = 19.0
LINE = 3.0


def entity(ax, name, x, y_top):
    fields = ENTITIES[name]
    h = 7.6 + LINE * (len(fields) - 1) + 2.6
    ax.add_patch(FancyBboxPatch((x, y_top - h), W, h, boxstyle="round,pad=0.3,rounding_size=0.8", fc="white", ec=GREEN, lw=1.1))
    ax.add_patch(FancyBboxPatch((x, y_top - 4.6), W, 4.6, boxstyle="round,pad=0.3,rounding_size=0.8", fc=GREEN, ec=GREEN, lw=1.1))
    ax.text(x + W / 2, y_top - 2.3, name, ha="center", va="center", color="white", fontsize=6.6, fontweight="bold")
    for i, f in enumerate(fields):
        ax.text(x + 1.0, y_top - 7.6 - i * LINE, f, ha="left", va="center", fontsize=5.3)
    return {"l": x, "r": x + W, "cx": x + W / 2, "top": y_top, "bot": y_top - h, "hy": y_top - 2.3}


def er_diagram():
    fig, ax = canvas(6.5, 5.2, xlim=(-4, 100), ylim=(10, 103))
    A, B, C = 99, 66, 38
    xs = [1, 27, 53, 79]
    u = entity(ax, "USERS", xs[0], A)
    o = entity(ax, "ORDERS", xs[1], A)
    oi = entity(ax, "ORDER ITEMS", xs[2], A)
    p = entity(ax, "PRODUCTS", xs[3], A)
    ci = entity(ax, "CART ITEMS", xs[0], B)
    pay = entity(ax, "PAYMENTS", xs[1], B)
    dl = entity(ax, "DELIVERIES", xs[2], B)
    cat = entity(ax, "CATEGORIES", xs[3], B)
    nt = entity(ax, "NOTIFICATIONS", xs[0], C)

    tag = dict(ha="center", va="center", fontsize=5.6, color=GREEN, fontweight="bold", bbox=dict(fc="white", ec="none", pad=0.5))

    def hrel(a, b, label):  # side by side, joined at header height
        ax.plot([a["r"], b["l"]], [a["hy"], b["hy"]], color=GREY, lw=1.0)
        ax.text((a["r"] + b["l"]) / 2, a["hy"] + 2.4, label, **tag)

    def vrel(a, b, label):  # one above the other
        x = a["cx"]
        ax.plot([x, x], [a["bot"], b["top"]], color=GREY, lw=1.0)
        ax.text(x + 3.2, (a["bot"] + b["top"]) / 2, label, **tag)

    hrel(u, o, "1:N")
    hrel(o, oi, "1:N")
    hrel(oi, p, "N:1")
    vrel(u, ci, "1:N")
    vrel(o, pay, "1:N")
    vrel(p, cat, "N:1")
    # order -> delivery (diagonal between the two rows)
    x1, x2 = o["r"] - 3, dl["l"] + 3
    ax.plot([x1, x2], [o["bot"], dl["top"]], color=GREY, lw=1.0)
    ax.text((x1 + x2) / 2 + 3.2, (o["bot"] + dl["top"]) / 2, "1:1", **tag)
    # user -> notifications down the left margin
    ax.plot([u["l"], -2], [u["hy"], u["hy"]], color=GREY, lw=1.0)
    ax.plot([-2, -2], [u["hy"], nt["hy"]], color=GREY, lw=1.0)
    ax.plot([-2, nt["l"]], [nt["hy"], nt["hy"]], color=GREY, lw=1.0)
    ax.text(-2, (u["hy"] + nt["hy"]) / 2, "1:N", rotation=90, **tag)

    ax.text(50, 105, "Grocify: data model (ER diagram)", ha="center", fontsize=8, fontweight="bold")
    ax.text(27, C - 1, "PK = primary key,  FK = foreign key.\n"
                       "Cart items also refer to products (N:1).\n"
                       "Order items are stored inside the order; the item name and\n"
                       "price are copied so later price changes never alter old orders.",
            ha="left", va="top", fontsize=5.6, color=GREY, linespacing=1.5)
    fig.savefig(OUT / "er-diagram.png", dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------- order flow
def order_flow():
    fig, ax = canvas(6.5, 5.6, ylim=(-5, 102))
    mx, bw, bh = 4, 44, 8.4
    cx = mx + bw / 2
    blue = dict(fc=BLUE_L, ec="#1565c0")
    box(ax, mx, 90, bw, bh, "Customer browses by category or searches", fs=6.6, **blue)
    box(ax, mx, 79, bw, bh, "Adds items to the cart (server checks stock\nand calculates the total)", fs=6.6, **blue)
    box(ax, mx, 68, bw, bh, "Checkout: confirms the delivery address", fs=6.6, **blue)
    diamond(ax, cx, 57, 34, 11, "Enough stock for\nevery item?")
    box(ax, mx, 38.5, bw, bh, "ONE all-or-nothing step: unique order ID, stock\nreduced, cart cleared, customer notified", fs=6.6)
    box(ax, mx, 27.5, bw, bh, "Customer pays: UPI, Card or Net Banking", fs=6.6)
    diamond(ax, cx, 17, 34, 11, "Payment\nsuccessful?")
    box(ax, mx, -3, bw, 11, "Order confirmed > admin assigns a delivery person >\nPacked > Shipped > Out for Delivery > Delivered\n(customer is notified at every step)", fs=6.3)

    arrow(ax, (cx, 90 - 0.4), (cx, 79 + bh + 0.4))
    arrow(ax, (cx, 79 - 0.4), (cx, 68 + bh + 0.4))
    arrow(ax, (cx, 68 - 0.4), (cx, 57 + 5.5 + 0.2))
    arrow(ax, (cx, 57 - 5.5), (cx, 38.5 + bh + 0.4), "Yes", loff=(2.4, 0))
    arrow(ax, (cx, 38.5 - 0.4), (cx, 27.5 + bh + 0.4))
    arrow(ax, (cx, 27.5 - 0.4), (cx, 17 + 5.5 + 0.2))
    arrow(ax, (cx, 17 - 5.5), (cx, -3 + 11 + 0.4), "Yes", loff=(2.4, 0))

    box(ax, 62, 50.5, 36, 13, "Refused: \"only N available\"\nNothing is reserved or changed;\ncustomer adjusts the cart", fc="#ffebee", ec=RED, fs=6.2)
    arrow(ax, (cx + 17, 57), (61.6, 57), "No", loff=(0, 1.8), color=RED)
    box(ax, 62, 8.5, 36, 17, "Order stays \"Payment Pending\"\nCustomer can retry. If unpaid\nafter 15 minutes the order is\ncancelled and stock is restored", fc="#fff8e1", ec="#ef6c00", fs=6.2)
    arrow(ax, (cx + 17, 17), (61.6, 17), "No", loff=(0, 1.8), color=RED)
    ax.text(50, 101.5, "Grocify: from browsing to delivery", ha="center", fontsize=8, fontweight="bold")
    fig.savefig(OUT / "order-flow.png", dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    architecture()
    er_diagram()
    order_flow()
    print("Diagrams written to", OUT)
