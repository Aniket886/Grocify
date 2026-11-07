# Grocify

Online Grocery E-Commerce System with Secure Digital Payments and Logistics Management (PBL, UC25CA2303).

**Status: Phase 6 done** (all ten functional requirements work, hardened and tested: 44 automated tests). Next: Phase 7 (final build, 12-page report, demo).

Docs: [Design](docs/Phase2-Design.md) · [Test report](docs/Test-Report.md) · [Logging](docs/Logging.md) · [Clickable mock-up](docs/mockup.html)

## Run it

```bash
npm install
npm run seed        # sample products + admin account from .env
npm run server      # API on port 5000
npm run dev:client  # website on port 5173 (second terminal)
npm test            # backend tests
```

Copy `.env.example` to `.env` and fill the placeholders. The admin login comes from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`.

## Local development mode

Firebase keys are not connected yet, so Phase 3 runs in **local mode**:
- Data is stored in `server/data/dev-db.json` (git-ignored) by `server/data/localStore.js`.
- Login uses bcrypt-hashed passwords and signed tokens (`server/middleware/authenticate.js`).

To move to Firebase later, replace `localStore.js` with a Firestore version that has the same functions, and swap token checking in `authenticate.js` for Firebase Admin verification. Controllers and screens do not change.

## What works now

| Requirement | Status |
|---|---|
| FR1 Registration, login, profile and delivery address | Done |
| FR2 Products by category, search, price, description, availability; admin add/update/delete | Done |
| FR3 Cart: add, change quantity, remove, automatic total | Done |
| FR4 Orders: place with delivery address, unique order ID, history; admin views and cancels unpaid orders | Done |
| FR5 Payment: UPI / Card / Net Banking, status and transaction recorded, confirmation (mock provider) | Done |
| FR6 Inventory: stock drops on order, admin monitors stock, low-stock flagged | Done |
| FR10 Authentication required, separate customer and admin permissions, no payment details stored | Done |
| FR7 Logistics: admin assigns a delivery person and moves orders Order Placed, Packed, Shipped, Out for Delivery, Delivered; customer tracks the status | Done |
| FR8 Admin: dashboard, customers, products, categories, orders, payments, inventory, deliveries, sales and order reports | Done |
| FR9 Notifications: order confirmation, payment status (success, failure, cancelled/expired), delivery updates (in-app) | Done |

## How delivery and notifications work

- A delivery record is created when payment succeeds. Statuses move forward **one step at a time** (no skipping or going back).
- A delivery person must be assigned before an order can be marked **Shipped**.
- Every status change, payment result and cancellation creates a notification for the customer in the same step as the change, so none is missed. The navbar shows the unread count.
- Reports group orders by the day they were placed; revenue counts **paid** orders only. Optional date range on the report page.
- Notifications are in-app only. Email or SMS could be added later.

## How orders work

- **Order ID:** `ORD-<date>-<customerCode>-<number>`, e.g. `ORD-20261107-VC53-0001`. The number counts up per customer.
- **Placing an order is one all-or-nothing step:** check stock for every item, reduce stock, write the order, clear the cart. If two customers want the last item, one succeeds and the other is told it is gone.
- **Stock rule:** stock is reserved when the order is placed. If it is not paid within `PAYMENT_TIMEOUT_MINUTES` (default 15), or the customer/admin cancels it, the order is cancelled and the stock goes back.
- **Double clicks:** the checkout page sends an `Idempotency-Key`, so repeated submits create one order.
- **Payment:** goes through `server/payments/`. `PAYMENT_PROVIDER=mock` is a fake gateway with a "simulate failed payment" button (test mode only). A failed payment keeps the order open for a retry. Card, UPI and bank details are never accepted or stored.
- **Real gateway later:** fill in `server/payments/gatewayProvider.js` (steps are in the file) and set `PAYMENT_PROVIDER` in `.env`.

## Notes
- "Delete" on a product hides it (so old orders stay valid).
- Cart totals are calculated on the server from current prices and stock.
- Passwords are never returned by the API. Nobody can register as admin.
