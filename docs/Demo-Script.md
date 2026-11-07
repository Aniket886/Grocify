# Grocify: Demo Script and Viva Preparation

The PBL asks for a **live demonstration** of: user login, product selection, cart management, order placement, payment, order tracking. This script covers all six in about 9 minutes, then the extras that earn the "Functionality", "Innovation" and "Viva" marks.

## 1. Before the demo (do this 10 minutes early)

| Step | Command or action |
|---|---|
| Install (first time only) | `npm install` |
| Start from clean data | `npm run demo:reset` (wipes orders and users, recreates sample products and the admin account) |
| Start the server | `npm run server` (leave this window open) |
| Start the website | `npm run dev:client` (second window) |
| Open the site | http://localhost:5173 in a private/incognito window (so no old login is remembered) |
| Admin login | Email and password are in your `.env` file (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). Keep the file closed on screen. |
| Second window | Keep a second browser window ready for the admin so you can switch quickly |
| Backup | Record a screen video of one full run the day before. If anything fails live, play it. |
| Check | Run `npm test` once. You should see **44 pass**. |

Do **not** run `npm run demo:reset` in the middle of the demo; it deletes everything.

## 2. The demo (about 9 minutes)

Suggested speaker is the team member who built that part. Change it to match your team.

| Time | Who | What to do | What to say |
|---|---|---|---|
| 0:00 | Anyone | Show the home page | "Grocify is an online grocery store with secure digital payments and delivery tracking. A customer can buy and track; an admin runs the shop from the same system." |
| 0:30 | Student 1 | **Register** a new customer (name, email, password of 8+ characters). You land on the profile; **add a delivery address** and save. | "Passwords are stored as hashes, never plain text. Nobody can register as an admin." |
| 1:30 | Student 1 | Open **Shop**. Pick a category, then use **search**. Point at the labels: Onion is *Out of stock* (button disabled), Banana is *Low stock*. | "Customers see price, description and availability before buying." |
| 2:30 | Student 1 | **Add to cart**: Apple twice, Milk, Rice. Open **Cart**. Change a quantity, remove an item, add it back. Point at the total. | "The total is calculated by the server, not the browser, and quantity can never exceed stock." |
| 3:30 | Student 2 | **Checkout**: confirm the address, click **Place order and pay**. Point at the **order ID** (like `ORD-20261107-AB12-0001`). | "One order step does everything or nothing: unique ID, stock reduced, cart cleared. A repeated click cannot create a second order." |
| 4:15 | Student 3 | On the payment page choose **UPI**, click **Simulate failed payment**. Show that the order is still pending. Then choose **Net Banking** and **Pay**. Show the **confirmation** with the transaction ID. | "A failed payment keeps the order open for a retry. We store only the method, result and transaction ID. Card and UPI details never reach our system. This is a test gateway; a real one plugs into the same place." |
| 5:15 | Student 2 | **Switch to the admin window** and log in. Open **Orders**: show the new order and its details. | "The admin sees every order with the customer and payment details." |
| 5:45 | Student 3 | Open **Inventory**. Show that stock dropped and low-stock products are highlighted red. | "Stock updated automatically when the order was placed. If an order is not paid within 15 minutes it is cancelled and the stock returns." |
| 6:30 | Student 2 | Open **Deliveries**. Try **Mark Shipped** before assigning: it is refused. Type a delivery person's name, click **Assign**, then step through **Packed, Shipped, Out for Delivery**. | "Delivery moves one step at a time, and a delivery person must be assigned before shipping." |
| 7:30 | Student 1 | Switch to the **customer** window: open **My Orders, Track order** (timeline) and **Notifications**. | "The customer sees each step with its time, and gets a notification for the order, the payment and every delivery update." |
| 8:15 | Student 3 | Admin: **Dashboard**, **Payments**, **Reports**. | "Admins also get customers, payments and a sales report. Revenue counts paid orders only." |
| 8:45 | Anyone | Close with the limits and next steps (below). | "Today it runs on a local data store with a test payment gateway. The next steps are Firebase and a real gateway, and the code has a place ready for each." |

### Optional extras (if time allows, 1 to 2 minutes)

- **The race test.** In a terminal run `npm test`. Point at the test named *20 customers race for 5 units*: "twenty customers ordered five units at the same moment; exactly five orders succeeded and stock ended at zero."
- **The logs.** Open today's file in `logs/`. Search for one order ID. "Every request has an ID, so we can follow one action from the screen to the log."
- **Security.** Log in as a customer and type an admin address (for example `/admin/orders`): you are sent back to the home page.

### Say this about limitations (it shows you understand the project)

1. The data store is a local file; it is fine for one server, and the code is arranged so a Firebase version can replace it.
2. Payment is simulated; no real money moves.
3. Notifications show inside the website only (no email or SMS yet).
4. The browser checks were done by hand; the server logic is covered by 44 automated tests.

## 3. If something goes wrong

| Problem | Fix |
|---|---|
| Website will not load | Check both windows are still running (`npm run server` and `npm run dev:client`) |
| "Address already in use" | An old copy is still running. Close the old windows, or restart the computer's terminal. |
| Admin login fails | Check the admin email and password in `.env`. After `npm run demo:reset` the admin is recreated from `.env`. |
| The site looks wrong or shows an old login | Hard refresh (Ctrl+Shift+R), or open a new private window |
| Data looks messy | Stop the server, run `npm run demo:reset`, start it again |
| Anything else breaks | Play the backup video and keep talking |

## 4. Viva preparation

### Everyone should be able to answer

| Question | Short answer |
|---|---|
| What problem does Grocify solve? | Online grocery shopping with secure payment and delivery tracking, plus admin tools, replacing manual order handling. |
| What are the main parts? | A React website, a Node.js/Express server, a data store, a payment provider layer, and logs. |
| Where is the real checking done? | On the server. The website only shows things; the server checks login, role, input and stock. |
| How are passwords protected? | Stored as bcrypt hashes; the plain password is never saved or logged. |
| How does login work? | The server gives a signed token at login; the browser sends it with every request. Roles (customer, admin) are checked on the server. |
| What if two people buy the last item? | Order creation is one all-or-nothing step, so one succeeds and the other is told it is gone. |
| What if the customer clicks Pay or Place Order twice? | Checkout sends a one-time key, so a repeat returns the same order. Payment can succeed only once per order. |
| When is stock reduced? | When the order is placed. If it is not paid in 15 minutes, or is cancelled, the stock goes back. |
| Why is the order ID in that format? | `ORD-date-customerCode-number`: the number counts up per customer and the code is unique per customer, so IDs never repeat. |
| Is card data stored? | No. Only the method, status and transaction ID. |
| Why a mock payment gateway? | No real money in a college project. The payment code uses an interface, so a real gateway is one new file and one setting. |
| What does "local mode" mean? | Data is in a local file and login is handled by us. Firebase replaces those two pieces later; the screens and rules do not change. |
| How do you know it works? | 44 automated tests (including a 20-customer race), plus hands-on checks in a browser. |
| What are the limitations? | See section 2: local data store, simulated payment, in-app notifications only, manual browser checks. |
| What would you add next? | Firebase, a real gateway, email/SMS notifications, invoices, product photos, coupons. |

### Know your own module

Each person should open their files before the viva and be able to explain them line by line. The roles below follow the PBL table; change them if your team split the work differently.

| Role | Files to know | Be ready to explain |
|---|---|---|
| **Student 1: Front-end** | `src/pages/customer/` (Login, Register, ProductList, ProductDetail, Cart), `src/components/`, `src/context/` | How a page asks the server for data; how the cart total updates; how login state is remembered; how admin pages are hidden from customers (and why the server still checks). |
| **Student 2: E-commerce and orders** | `server/controllers/ordersController.js`, `server/controllers/cartController.js`, `createOrderFromCart` in `server/data/localStore.js` | The order steps in order; why stock is checked before anything changes; the idempotency key; order ID format; how expiry works. |
| **Student 3: Payment and database** | `server/payments/`, `server/data/localStore.js`, `server/controllers/ordersController.js` (`pay`), `tests/` | The provider interface; why only method, status and transaction ID are stored; the data model (Figure 2 in the report); how the tests prove the race and double-payment cases. |
| **Student 4 (if any)** | `server/controllers/deliveriesController.js`, `adminController.js`, `notificationsController.js`, `docs/Logging.md` | Delivery step rules; how notifications are created; how the report is calculated; what the logs record. |

### Questions a teacher may ask to check you built it

- "Show me where the total is calculated." (`server/controllers/cartController.js`, `buildCart`)
- "Show me where a customer is stopped from opening an admin page." (`server/middleware/authorize.js` and the admin routes)
- "What happens if I change the price after someone orders?" (Order items copy the price, so old orders do not change.)
- "What happens if the server restarts during an unpaid order?" (The order and its deadline are saved in the data file; expiry is checked again the next time anyone asks for orders and every minute.)
- "Change the low-stock limit of a product." (Admin, Products, edit; or the `LOW_STOCK_DEFAULT_LIMIT` setting in `.env` for new products.)
