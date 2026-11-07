# Grocify: Test Report (Phase 6)

Use this in the project report's **Results & Discussion** section.

## Summary

| Check | Result |
|---|---|
| Automated tests (`npm test`) | **44 of 44 pass** (4 test files) |
| Dependency vulnerabilities (`npm audit`) | 0 found |
| Production build (`npm run build`) | Succeeds |
| Customer and admin journeys in a real browser | All steps worked (details below) |
| Phone-width layout (375 px) | No page overflows; wide admin tables scroll inside the page |
| Requirements working | All 10 functional requirements (FR1 to FR10) |

How to repeat: `npm test`. The tests start the real API on a temporary data file, so they never touch your demo data.

## Automated test cases

Each row is one automated test, except rows marked "same test", which are checked inside the test named in that row. "Result" is from the latest run (44 tests in total).

### FR1 User registration and login

| # | Test case | Expected | Result |
|---|---|---|---|
| 1 | Register, register again with the same email in capitals, register with a weak password, try to register as admin | 201 customer, 409 duplicate, 400 weak password, role stays customer | Pass |
| 2 | Log in with correct details, wrong password, unknown email | 200 with token, 401, 401 (same message for both) | Pass |
| 3 | Update profile and delivery address | Saved and returned on the next request | Pass |
| 4 | Use protected pages with no token or a garbage token | 401 | Pass |

### FR2 and FR3 Products and cart

| # | Test case | Expected | Result |
|---|---|---|---|
| 5 | Customer tries to add a product or category; admin does the same; admin sends a negative price | 403 for customer, 201 for admin, 400 for bad price | Pass |
| 6 | Browse by category, search, and check availability labels | Correct products; "low stock" and "out of stock" labels | Pass |
| 7 | Cart: add, add again, set quantity above stock, add an out-of-stock item, remove | Total correct at each step; 409 when stock is exceeded; empty cart ends at total 0 | Pass |
| 8 | Two customers each fill a cart | Carts stay separate | Pass |
| 9 | Admin deletes a product that is in a cart | Product disappears from the catalogue and the cart | Pass |
| 10 | Admin tries to use the customer cart | 403 | Pass |

### FR4 Order management

| # | Test case | Expected | Result |
|---|---|---|---|
| 11 | Check out with an empty cart; check out with no address | 400 for both | Pass |
| 12 | Place an order | ID like `ORD-20261107-AB12-0001`, total correct, status Payment Pending, stock reduced, cart cleared | Pass |
| 13 | One customer places 3 orders; another customer places one | Numbers 0001, 0002, 0003; all IDs distinct; different customer code | Pass |
| 14 | Same Idempotency-Key sent twice | One order, stock reduced once | Pass |
| 14a | **Two customers order the last unit at the same moment** | Exactly one order succeeds (201), the other is refused (409), stock never goes negative | Pass |
| 15 | Customer A's order opened, paid or cancelled by customer B | 404 each time; admin can view any order | Pass |

### FR5 Digital payment

| # | Test case | Expected | Result |
|---|---|---|---|
| 16 | Pay with an unknown method; simulate a failure; retry with success; try to pay again | 400; 402 and order stays pending; 200 and order confirmed with transaction ID; 409 | Pass |
| 17 | Send a card number and CVV with the payment | Not stored and not returned | Pass (same test as 16) |
| 18 | Two payments for one order at the same moment | Exactly one success recorded | Pass |

### FR6 Inventory management

| # | Test case | Expected | Result |
|---|---|---|---|
| 19 | Cancel an unpaid order; try to cancel a paid one | Stock restored; paid order refused (409) | Pass |
| 20 | Unpaid order passes its 15-minute deadline | Order cancelled, stock released, payment refused | Pass |
| 21 | Admin inventory view with the low-stock filter; customer and guest access | Low items listed with category; 403 and 401 for others | Pass |

### FR7 Logistics and delivery

| # | Test case | Expected | Result |
|---|---|---|---|
| 22 | Pay for an order | A delivery record exists with status Order Placed | Pass |
| 23 | Assign or advance an unpaid order | 409 | Pass |
| 24 | Skip a step, repeat a step, ship without an assigned person, then move through all five steps | 409 for each mistake; the full path works; history shows all five steps | Pass |
| 25 | List deliveries, filter by status, filter by a made-up status | Correct lists; 400 for the made-up status | Pass |

### FR8 Admin management

| # | Test case | Expected | Result |
|---|---|---|---|
| 26 | Customer or guest calls admin delivery, customer, payment and report pages | 403 / 401 | Pass |
| 27 | Admin customer and payment lists | Order count and total spent correct; no password data | Pass |
| 28 | Sales report on sample orders | Revenue counts paid orders only; status counts, per-day totals, top products and date filter correct | Pass |
| 29 | Report with bad or reversed dates | 400 | Pass |

### FR9 Notifications

| # | Test case | Expected | Result |
|---|---|---|---|
| 30 | Place, fail payment, succeed, let an order expire | Order confirmation, two payment messages, and a cancellation message | Pass |
| 31 | Each delivery move after Order Placed | Four delivery notifications, including "Out for Delivery" and "delivered" | Pass (same test as 24) |
| 32 | Read another customer's notification; mark one and all as read | 404 for others; unread count falls to 0; admin has no inbox | Pass |

### FR10 Security and access control

| # | Test case | Expected | Result |
|---|---|---|---|
| 33 | Broken JSON and a 200 KB body | 400 and 413; no stack trace shown | Pass |
| 34 | Unknown URL and security headers | JSON 404; no `x-powered-by`; `nosniff` set | Pass |
| 35 | Search every important response for secrets | No password hash and no idempotency key anywhere | Pass |
| 36 | Fuzzed input: injection-style objects, huge text, bad prices, fractional stock, bad quantities | 400 or 409, never a 500 | Pass |
| 37 | Profile update that tries to set role to admin or change the email | Ignored; still a customer | Pass |
| 38 | Forged token, `alg: none` token, token for a deleted user, expired token | 401 each | Pass |
| 39 | Log files are scanned for password, token, secret, card or request-body logging | None found; the check fails if a bad log line is added | Pass |

### Money, concurrency and load

| # | Test case | Expected | Result |
|---|---|---|---|
| 40 | 3 items at 0.10 each | Total is exactly 0.30 | Pass |
| 41 | **20 customers order 5 units at the same moment** | Exactly 5 orders succeed, 15 are refused, 5 distinct order IDs, stock is exactly 0 | Pass |
| 42 | One customer submits checkout 10 times at once with one key | One order; stock reduced once | Pass |
| 43 | Admin lowers stock after a customer filled a cart | Checkout refused with "Only 3 available"; nothing reserved | Pass |
| 44 | Cancel the same order twice at once | One 200 and one 409; stock restored once | Pass |
| | Also (request IDs) | Every response has an `X-Request-Id`; a safe one sent by the caller is kept | Pass |

## Manual checks in a real browser

| Journey | What was done | Result |
|---|---|---|
| Customer purchase | Register, add items, change quantities, check out, simulate a failed payment, retry, see confirmation, see order history | Worked; totals and stock correct at every step |
| Delivery | Admin tried to ship without assigning (refused with a clear message), assigned a person, moved the order step by step | Worked |
| Customer tracking | Timeline with timestamps, delivery person, and notification count in the navbar | Worked |
| Admin screens | Dashboard, orders, deliveries, payments, customers, inventory, reports | Numbers agreed with each other (revenue, order count, low-stock count) |
| Access control | A customer opens an admin address | Sent back to the home page |
| Phone layout | 16 pages at 375 px width | No page overflow |
| Unknown page | Open a made-up address | Friendly "Page not found" |

## Problems found in Phase 6 and fixed

| Problem | Why it mattered | Fix |
|---|---|---|
| Orders that expired during normal use were never logged (only the timed check logged them) | Missing audit trail for released stock | All expiry now goes through one function that logs |
| Log lines had no request ID | A single request could not be followed through the logs | Every request has an ID, shown in the response header and on every log line it produces |
| "Access denied" logged the path as `/` | Useless for investigating | Logs the real address |
| Request lines were always "info" | Hard to filter problems | 5xx are errors, 4xx are warnings |
| My first version of the log-safety test could not fail | It gave false confidence | Rewritten, and proven to fail when a password is added to a log line |
| Unexpected server errors showed only a generic message | Support could not find the cause | The message now includes the request ID |
| Blank page if a screen crashed; plain text for unknown pages; no keyboard focus outline | Poor experience | Error screen, a proper 404 page, visible focus outlines |

## Known limits (be honest about these in the report)

- The site runs in **local mode** (a JSON file and its own login) until Firebase is connected.
- Payment uses a **mock gateway**; no real money moves. The real gateway slot is ready but empty.
- Notifications are in-app only (no email or SMS).
- The browser checks were done by hand; there are no automated browser tests.
- The login rate limiter is switched off during tests, so it was not tested automatically.
- Tests run one process on one machine; real multi-server concurrency would need the Firebase transaction version.
