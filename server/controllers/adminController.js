import * as store from '../data/localStore.js';
import { badRequest } from '../middleware/validate.js';

const round2 = (n) => Math.round(n * 100) / 100;
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isPaid = (o) => o.paymentStatus === 'paid';

// ---------- customers ----------
export async function customers(req, res) {
  const [users, orders] = await Promise.all([store.listCustomers(), store.listAllOrders()]);
  res.json({
    customers: users.map((u) => {
      const mine = orders.filter((o) => o.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        address: u.address || null,
        joinedAt: u.createdAt,
        orderCount: mine.length,
        totalSpent: round2(mine.filter(isPaid).reduce((s, o) => s + o.total, 0)),
      };
    }),
  });
}

// ---------- payments ----------
export async function payments(req, res) {
  const list = await store.listAllPayments();
  const rows = [];
  for (const p of list) {
    const user = await store.findUserById(p.userId);
    rows.push({ id: p.id, orderId: p.orderId, customer: user?.name || '—', method: p.method, status: p.status, transactionId: p.transactionId, amount: p.amount, failureReason: p.failureReason || null, createdAt: p.createdAt });
  }
  res.json({ payments: rows });
}

// ---------- reports ----------
// Orders are grouped by the day they were placed. Revenue counts paid orders only.
export function buildSalesReport(orders, { from, to } = {}) {
  const inRange = orders.filter((o) => {
    const day = o.createdAt.slice(0, 10);
    return (!from || day >= from) && (!to || day <= to);
  });
  const paid = inRange.filter(isPaid);
  const revenue = round2(paid.reduce((s, o) => s + o.total, 0));

  const byStatus = {};
  inRange.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  const days = new Map();
  inRange.forEach((o) => {
    const day = o.createdAt.slice(0, 10);
    const row = days.get(day) || { date: day, orders: 0, revenue: 0 };
    row.orders += 1;
    if (isPaid(o)) row.revenue = round2(row.revenue + o.total);
    days.set(day, row);
  });

  const products = new Map();
  paid.forEach((o) => o.items.forEach((i) => {
    const row = products.get(i.productId) || { name: i.name, quantity: 0, revenue: 0 };
    row.quantity += i.quantity;
    row.revenue = round2(row.revenue + i.price * i.quantity);
    products.set(i.productId, row);
  }));

  return {
    range: { from: from || null, to: to || null },
    totals: {
      orders: inRange.length,
      paidOrders: paid.length,
      pendingPayment: byStatus['Payment Pending'] || 0,
      cancelled: byStatus.Cancelled || 0,
      revenue,
      averageOrderValue: paid.length ? round2(revenue / paid.length) : 0,
    },
    byStatus,
    byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5),
  };
}

export async function salesReport(req, res) {
  const { from, to } = req.query;
  if (from && !isDate(from)) throw badRequest('"from" must be a date like 2026-11-01');
  if (to && !isDate(to)) throw badRequest('"to" must be a date like 2026-11-30');
  if (from && to && from > to) throw badRequest('"from" must not be after "to"');
  res.json(buildSalesReport(await store.listAllOrders(), { from, to }));
}
