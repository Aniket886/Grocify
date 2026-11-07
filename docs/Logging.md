# Grocify: Logging

Use this in the project report's **Implementation** section.

## Setup

| Item | Value |
|---|---|
| Library | Winston with `winston-daily-rotate-file` |
| Files | `logs/app-YYYY-MM-DD.log` (everything) and `logs/error-YYYY-MM-DD.log` (errors only) |
| Rotation | New file every day, keep 14 days, max 10 MB per file |
| Format | One JSON object per line: time, level, message, plus details |
| Console | Also printed in development |
| Settings | `LOG_LEVEL`, `LOG_DIR`, `LOG_MAX_FILES`, `LOG_MAX_SIZE` in `.env` |
| Git | `logs/` is git-ignored |

## Levels

| Level | Used for |
|---|---|
| error | Unexpected server failures (with the stack trace), and any request that ends in a 5xx |
| warn | Things worth noticing: failed login, failed payment, low stock, access denied, any request that ends in a 4xx |
| info | Normal events: registration, login, orders, payments, delivery changes, admin edits |

## Request IDs

Every request gets an ID, returned in the `X-Request-Id` response header and written on **every** log line that request produces. To investigate a problem, take the ID from the response and search the logs for it. Unexpected server errors also show the ID to the user.

## What is logged

| Area | Events |
|---|---|
| Accounts | Registered, login success (with role), login failed, profile updated |
| Access | Access denied (user, role, address) |
| Orders | Order created (total, item count), order failed (reason), order cancelled, order expired and stock released |
| Stock | Stock reduced per item, low stock reached |
| Payment | Initiated (method, provider), succeeded (amount, transaction ID), failed (reason) |
| Delivery | Delivery person assigned, delivery status changed |
| Admin | Product and category created, updated, deleted |
| Requests | One line per request: ID, method, address, status, time taken in ms, user, IP |
| Errors | Unhandled errors with stack trace and request ID |

## What is never logged

Passwords, login tokens, secret keys, card or UPI details, and request bodies. An automated test scans the source and fails if any log call includes them.

## Real sample (from a test run; IDs shortened)

A customer places an order, pays (first attempt fails), then an admin processes it:

```
WARN  Login failed             {"email":"nobody@grocify.test","requestId":"8c7a97da"}
INFO  Order created            {"items":2,"orderId":"ORD-20261107-6DD2-0001","requestId":"bc1044ae","total":176,"userId":"9d80eba5"}
INFO  Stock reduced            {"orderId":"ORD-20261107-6DD2-0001","productId":"967c7643","quantity":2,"requestId":"bc1044ae"}
WARN  Low stock                {"limit":10,"name":"Banana (1 dozen)","stock":6,"requestId":"bc1044ae"}
INFO  Payment initiated        {"method":"UPI","orderId":"ORD-20261107-6DD2-0001","provider":"mock","requestId":"68cba1f1"}
WARN  Payment failed           {"orderId":"ORD-20261107-6DD2-0001","reason":"Payment declined (simulated)","requestId":"68cba1f1"}
WARN  request                  {"method":"POST","path":"/api/orders/ORD-20261107-6DD2-0001/pay","status":402,"ms":3,"userId":"9d80eba5","ip":"::1","requestId":"68cba1f1"}
INFO  Payment succeeded        {"amount":176,"orderId":"ORD-20261107-6DD2-0001","transactionId":"MOCK-B1D25B5408BA","requestId":"bb1dcf28"}
WARN  Access denied            {"path":"/api/categories","role":"customer","userId":"9d80eba5","requestId":"77b8d4a6"}
INFO  Delivery status changed  {"adminId":"cf1d75c6","orderId":"ORD-20261107-6DD2-0001","status":"Packed","requestId":"6323c8ea"}
INFO  Delivery assigned        {"adminId":"cf1d75c6","assignedTo":"Ravi Kumar","orderId":"ORD-20261107-6DD2-0001","requestId":"8c25036b"}
```

Notice the three lines with request ID `68cba1f1`: they are the same failed payment request, from start to finish.

## Where it lives

- `server/config/logger.js`: setup, rotation, levels.
- `server/app.js`: request ID and the one-line-per-request log.
- `server/middleware/errorHandler.js`: error logging.
- `server/services/orderService.js`: expiry logging (used by the timed check and by requests).
- Controllers log their own business events through `req.log`, the per-request logger.
