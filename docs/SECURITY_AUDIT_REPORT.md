# Grocify: Web Application Security Audit

| | |
|---|---|
| Target | Grocify v1.1.4, live at `https://gmu2027.space` (Render), repository `Aniket886/Grocify` (private) |
| Audit date | 10 November 2026 |
| Scope | 56-point checklist: website, Node/Express API, data store, payment integration, deployment, DNS |
| Method | Code review, 76 automated tests, dependency audit, Git history scan (79 commits, 19 branches), build inspection, read-only live checks |
| Fixes | Branch `security/audit-2026-11-10` (pull request, **not yet merged or deployed**) |

No secret values appear anywhere in this document. No attack traffic was sent: the live checks were plain GET, HEAD and OPTIONS requests and public DNS lookups. No login was attempted on the live site.

## 1. Summary

20 findings from 56 checks. 13 are fixed in code and re-tested (5 of those need an owner step to finish). 7 remain open because they need an account, DNS or design decision.

| Severity | Found | Fixed | Open |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| High | 3 | 3 | 0 |
| Medium | 9 | 5 | 4 |
| Low | 7 | 4 | 3 |
| **Total** | **20** | **13** | **7** |

- **Risk today (live site): High.** The live site still runs v1.1.4, so every finding below is present there until this branch is merged and deployed.
- **Risk after merge plus owner actions 1 to 3: Low to Medium** for a prototype with simulated payments.
- **Most important fix:** the login bypass (F-01).
- **Most important open action:** set real secrets on the host and change the two passwords that were once in the source (owner actions 1 and 2).
- **Already done well:** bcrypt password hashing, server-side prices and totals, role checks on the server for every admin route, all-or-nothing order creation, signed and replay-protected webhooks, no source maps, no exposed files, HTTPS with HSTS, 0 known-vulnerable packages.

Severity scale: **Critical** = remote, unauthenticated compromise of data, accounts, money or server. **High** = serious compromise needing little effort or a low-privilege account. **Medium** = needs specific conditions or chaining. **Low** = hardening.

## 2. Findings

### F-01 Login accepted any password for one account (Critical, Fixed)
Checklist 1, 31. `server/controllers/authController.js` (`login`).
For one hardcoded email address, login accepted **any** password of 6 or more characters, overwrote the stored password with it, and created the account if it did not exist. Anyone who knew that address could take over the account (name, phone, address, orders).
**How it arises:** a "never lock me out" convenience added during deployment trouble. A special case in authentication is a backdoor, whatever the intent.
**Fix:** the special case is removed. Login has one path: the email must exist and the password must match its hash. Tests: three `F-01` tests; confirmed to fail when the bypass is put back.
**Pattern:**
```js
const user = await store.findUserByEmail(mail);
const ok = await bcrypt.compare(supplied, user?.passwordHash || DUMMY_HASH);
if (!user || !ok) throw badRequest('Incorrect email or password', 401);
```

### F-02 Built-in account passwords in source (High, Fixed (partial))
Checklist 2, 11, 25. `server/index.js` (`autoSeed`).
Startup created an admin account with a hardcoded password (`XXXX`) when `SEED_ADMIN_*` was not set, and a customer account with another hardcoded password. Rated High, not Critical, because the repository is private and it only applies if the host variables are unset (not verifiable from outside).
**Fix:** accounts are created only from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. An admin still on the old password is moved to the configured one and signed out; other accounts still on one are reported in the log by user id. The old values are kept only as a deny-list. Tests: four `F-02` tests.
**Still needed (owner):** change both passwords (action 2). Code removal does not un-leak a password.

### F-03 Fallback token-signing secret in source (High, Fixed (partial))
Checklist 11, 25, 30. `server/config/env.js`.
If `JWT_SECRET` was unset, tokens were signed with a constant in the code. Anyone who had seen the repository could then forge a token for any user, including the admin.
**Fix:** no constant. Without `JWT_SECRET` a random per-process secret is used and an error is logged; verification is pinned to HS256. Tests: two `F-03` tests.
**Still needed (owner):** confirm `JWT_SECRET` is set on Render; if unsure, set a new long random value (action 1).
**Pattern:** `jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })`

### F-04 A paid gateway order could settle a different order (High, Fixed)
Checklist 19, 39, 40. `server/controllers/paymentsController.js` (`verifyUtr`, `status`, `webhook`).
UTR verification trusted a gateway order number sent by the browser and only checked that *some* gateway order was paid. A customer could pay ₹1 for one order and use it to mark a ₹1,499 order as paid. The webhook and status paths did not compare amounts either. Rated High rather than Critical because production currently runs the mock provider (F-11), so this path is not live yet.
**Fix:** a gateway record settles an order only if its `client_order_id` is that order **and** its amount equals the order total, on all three paths. Inputs are format-checked. Tests: five `F-04` tests; confirmed to fail when the check is removed.
**Pattern:**
```js
if (String(gw.client_order_id) !== String(order.id)) return 'different order';
if (Math.round(Number(gw.amount) * 100) !== Math.round(order.total * 100)) return 'amount mismatch';
```

### F-05 Runtime database was committed to Git (Medium, Open (owner action))
Checklist 24, 25. `server/data/dev-db.json` in 8 commits (first `5f7aefb`, removed in `0f5447a`).
The file held up to 3 user records with password hashes (one admin, one with a real email address and postal address), 6 orders and 3 payments. It is no longer tracked and is git-ignored, but it remains in history. Medium because the repository is private.
**Owner:** change those passwords (action 2). Optionally purge the file from history with `git filter-repo` (rewrites history; not forced here).

### F-06 CORS reflected any origin with credentials (Medium, Fixed)
Checklist 13. `server/app.js`. Confirmed live: `Origin: https://attacker.example` was echoed back with `Access-Control-Allow-Credentials: true`. Impact is limited because login tokens travel in a header, not a cookie.
**Fix:** only `CLIENT_URL`, `CORS_ORIGINS` and same-host requests get CORS headers. Test: `F-06`; confirmed to fail when reflection is restored.

### F-07 Host header written into the page unescaped (Medium, Fixed)
Checklist 7, 34. `server/app.js`. `X-Forwarded-Host` was inserted into the HTML link-preview tags as-is, so a crafted header could inject markup (a risk if a cache ever stored the response).
**Fix:** the header is used only when it is a plain hostname. Test: `F-07`.

### F-08 No Content-Security-Policy (Medium, Fixed)
Checklist 14. `server/app.js` had `contentSecurityPolicy: false`; confirmed live (no CSP header).
**Fix:** CSP on every HTML response: scripts from this site only, the one inline script allowed by SHA-256 hash, plus `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, and a `Permissions-Policy`. Checked in a browser on a production build: 0 violations on 20 pages. Test: `F-08`.
**Not verified:** service-worker registration under the CSP on HTTPS (see section 5).

### F-09 Rate limiting covered only login and register, keyed on the proxy (Medium, Fixed (partial))
Checklist 12, 31. `server/middleware/rateLimit.js`, `server/app.js`. No limit on payment, UTR or account routes, and `trust proxy` was unset, so behind Render all visitors could share one counter.
**Fix:** limits on order placement, payment, UTR verification, password change and account deletion; one proxy hop trusted in production (`TRUST_PROXY` to override). Test: `F-09`.
**Remaining:** counters are in memory (fine for one instance). After deploy, confirm the logged client IPs look right; if not, adjust `TRUST_PROXY`.

### F-10 Sessions could not be revoked (Medium, Fixed (partial))
Checklist 29. 7-day tokens kept in `localStorage`, no password-change feature, no revocation.
**Fix:** tokens carry a version; `PUT /api/auth/password` (current + new password) bumps it and signs out all older sessions. Test: `F-10`.
**Remaining (design work):** no screen for it yet (API only), and the token stays in `localStorage`; moving to an `HttpOnly` cookie needs CSRF protection and a tested release.

### F-11 Production accepts simulated payments (Medium, Open (accepted risk))
Checklist 19, 40. Live `/api/payments/config` reports `provider: mock`. Any customer can mark an order paid without paying. This is the intended prototype behaviour and the site shows a demo banner; it must not ship real goods in this state.

### F-12 Customers can advance their own delivery (Medium, Open (accepted risk))
Checklist 40. `POST /api/orders/:id/progress` lets a customer move their paid order to Delivered. It powers the demo tracker. A switch was added: set `DEMO_DELIVERY_CONTROLS=false` to disable it (test `F-12`). Default unchanged so the demo keeps working.

### F-13 No second factor for the admin account (Medium, Open (needs design work))
Checklist 32. Admin access rests on one password. Add TOTP for admins in a separate, tested change.

### F-14 Database TLS certificate not verified (Low, Open (owner action))
Checklist 3, 44. `server/data/localStore.js` used `rejectUnauthorized: false`. A switch was added (`DATABASE_SSL_VERIFY=true`, test `F-14`) but left off, because turning it on blindly could break the live database connection. Owner action 5.

### F-15 Personal details in source and logs (Low, Fixed)
Checklist 54. A real name, email, phone and address were hardcoded for seeding, and failed logins logged the full email. Removed; failed-login logs now mask the address. Test: `F-15`.

### F-16 Missing files answered with the app page; small validation gaps (Low, Fixed)
Checklist 6, 23, 42. `/.env`, `/backup.zip` and similar returned `200` with the app shell (no content leaked, but misleading to scanners). They now return 404. Also fixed: a numeric `max` that was ignored, a non-string UTR causing a 500, and the UTR response returning the whole internal order record. Tests: `F-16`, `validation`.

### F-17 No SPF or DMARC record (Low, Open (owner action))
Checklist 48. `gmu2027.space` has no MX, SPF or DMARC, so others can send mail that claims to be from it. Owner action 6.

### F-18 No secret scanning or incident plan (Low, Fixed)
Checklist 51, 56. Added `.github/workflows/secret-scan.yml` (gitleaks on every push and PR) and `docs/INCIDENT_RESPONSE.md`.

### F-19 Credentials document not git-ignored (Low, Fixed (partial))
Checklist 11. An untracked `docs/DEPLOYMENT_AND_CREDENTIALS_GUIDE.md` in the working folder matches secret patterns (contents were not read) and was not covered by `.gitignore`. Ignore rules for `*CREDENTIALS*` and `*SECRETS*` documents were added. **Remaining:** move the file out of the repository folder (action 4).

### F-20 No alerting on errors or security events (Low, Open (owner action))
Checklist 53. Events are logged but nobody is notified. Owner action 7.

## 3. Checks that passed

- **Password hashing (5):** bcrypt, cost 10; hashes never returned.
- **Admin routes (9) and IDOR (28):** role checked on the server for every admin route; customers get 404 for other customers' orders, payments and notifications (tests).
- **SQL (10) and injection (34, 38):** three parameterised statements; no shell, `eval` or unsafe deserialisation in the server.
- **XSS (7):** no `innerHTML` / `dangerouslySetInnerHTML`; React escapes output.
- **Prices (19):** totals computed on the server from stored prices; order items copy the price.
- **Webhook (39):** HMAC-SHA256, 5-minute window, constant-time compare, fails closed without a secret.
- **HTTPS (4):** 301 to HTTPS; HSTS one year. **Exposed files (23), source maps (46):** none served.
- **Dependencies (21):** `npm audit` 0 vulnerabilities (app and gateway front end). **Supply chain (50):** one lockfile, `npm ci` in CI.
- **Mass assignment (33), error handling (41), debug mode (20):** role and email cannot be set from the profile; no stack traces; production mode confirmed live.

## 4. Actions for the owner (in order)

1. **Before merging or right after:** on Render set `JWT_SECRET` (long random), `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (8+ characters, not an old one). Without them, after deploy there is no way to create an admin and logins reset on restart. (F-02, F-03)
2. **Change the two passwords that were in the source and in Git history:** the admin (done automatically at startup if step 1 is set) and the owner's customer account (`PUT /api/auth/password`, or ask for a Change password screen). (F-01, F-02, F-05)
3. Merge the pull request and redeploy; then check the site, log in, and confirm the service worker still registers (browser DevTools, Application tab). (F-08)
4. Move `docs/DEPLOYMENT_AND_CREDENTIALS_GUIDE.md` out of the project folder into a password manager; if any secret in it was ever shared, rotate it. (F-19)
5. Set `DATABASE_SSL_VERIFY=true` on a test deploy; keep it if the database still connects. (F-14)
6. Add DNS records: TXT `v=spf1 -all` on the domain and TXT `v=DMARC1; p=reject;` on `_dmarc`. (F-17)
7. Turn on Render notifications or an uptime monitor for failures. (F-20)
8. Before taking real money: switch off the mock provider, set `DEMO_DELIVERY_CONTROLS=false`, add admin MFA. (F-11, F-12, F-13)
9. Optional: purge `server/data/dev-db.json` from Git history; delete the unused `npm-publish-github-packages.yml` workflow. (F-05)

## 5. What could not be verified

1. Whether Render has `JWT_SECRET` and `SEED_ADMIN_*` set (needs the Render dashboard). No login was attempted on the live site.
2. Service-worker registration under the new CSP: the test browser refuses service workers on local `http` with or without the CSP, so this needs a look after deployment.
3. The database: provider, network exposure, user privileges, backups and restore (needs the provider dashboard). (3, 44, 52)
4. `upi-gateway/` (vendored third-party Laravel project, not deployed in production): reviewed only where Grocify calls it; its PHP dependencies were not audited (no Composer available) and its own code was not audited in depth.
5. `testmyproject.space`: did not answer over HTTPS; its DNS and hosting were not assessed. (49)
6. Render container hardening and GitHub account settings (2FA, branch protection). (55)

## 6. Full checklist

| # | Check | Status | Sev. | Ref | Evidence |
|---|---|---|---|---|---|
| 1 | Authentication | Fixed | Critical | F-01 | V3, V4 |
| 2 | Hide API keys | Fixed (partial) | High | F-02 | V2, V8 |
| 3 | Lock the database | Not verified | - | F-14 | Section 5.3 |
| 4 | Enforce HTTPS | Passed | - | - | V9 |
| 5 | Hash passwords | Passed | - | - | V1 |
| 6 | Server-side validation | Fixed | Low | F-16 | V3 |
| 7 | Block XSS | Fixed | Medium | F-07 | V6, V3 |
| 8 | Log suspicious activity | Passed | - | F-15 | V1, V3 |
| 9 | Lock admin routes | Passed | - | - | V3 |
| 10 | Parameterized queries | Passed | - | - | V6 |
| 11 | Env variables | Fixed (partial) | High | F-02, F-03, F-19 | V3 |
| 12 | Rate limiting | Fixed (partial) | Medium | F-09 | V3 |
| 13 | Restrict CORS | Fixed | Medium | F-06 | V10, V3 |
| 14 | Security headers | Fixed | Medium | F-08 | V9, V11 |
| 15 | Secure cookies | N/A | - | - | No cookies; token in header |
| 16 | CSRF protection | N/A | - | - | No cookie auth; header token is not sent cross-site |
| 17 | Expiring reset links | N/A | - | - | No password-reset feature |
| 18 | Upload limits | N/A | - | - | No file uploads |
| 19 | Verify prices | Fixed | High | F-04, F-11 | V3 |
| 20 | Debug mode off | Passed | - | - | V12 |
| 21 | Update dependencies | Passed | - | - | V5 |
| 22 | Remove unused packages | Passed | - | - | V1; unused workflow noted |
| 23 | Exposed files | Fixed | Low | F-16 | V13 |
| 24 | Scan Git history | Open (owner action) | Medium | F-05 | V2 |
| 25 | Revoke leaked keys | Open (owner action) | High | F-02, F-03, F-05 | Section 4 |
| 26 | Full security review | Passed | - | - | This report |
| 27 | Test + report | Passed | - | - | V3, V7 |
| 28 | Authorization / IDOR | Passed | - | - | V3 |
| 29 | Session management | Fixed (partial) | Medium | F-10 | V3 |
| 30 | JWT handling | Fixed | High | F-03 | V3 |
| 31 | Brute force & enumeration | Fixed (partial) | Medium | F-09 | V3 |
| 32 | MFA for admins | Open (needs design work) | Medium | F-13 | V1 |
| 33 | Mass assignment | Passed | - | - | V3 |
| 34 | Other injection | Fixed | Medium | F-07 | V6, V3 |
| 35 | SSRF | Passed | - | - | V6: fixed gateway URL, encoded and format-checked ids |
| 36 | Path traversal | Passed | - | - | V6: static handler only |
| 37 | Open redirects | Passed | - | - | V6: no server redirects |
| 38 | Insecure deserialization | Passed | - | - | V6 |
| 39 | Payment webhook verification | Fixed | High | F-04 | V3 |
| 40 | Business logic & races | Open (accepted risk) | Medium | F-11, F-12 | V3 |
| 41 | Error handling | Passed | - | - | V3 |
| 42 | Sensitive data exposure | Fixed | Low | F-16 | V3 |
| 43 | Cloud storage permissions | N/A | - | - | No object storage |
| 44 | Least-privilege accounts | Not verified | - | - | Section 5.3 |
| 45 | Third-party scripts | Passed | - | - | V8: no third-party scripts; fonts CSS only |
| 46 | Source maps & bundle | Passed | - | - | V7, V8, V13 |
| 47 | AI / LLM features | N/A | - | - | None |
| 48 | Email security | Open (owner action) | Low | F-17 | V14 |
| 49 | Subdomain takeover | Passed | - | - | V14 (`www`); second domain not verified |
| 50 | Supply chain | Passed | - | - | V1, V5 |
| 51 | Ongoing secret scanning | Fixed | Low | F-18 | V15 |
| 52 | Backups & recovery | Not verified | - | - | Section 5.3 |
| 53 | Monitoring & alerting | Open (owner action) | Low | F-20 | V1 |
| 54 | Data protection & privacy | Fixed | Low | F-15 | V3; DPDP review is an owner task |
| 55 | Server / container hardening | Not verified | - | - | Section 5.6 |
| 56 | Incident response plan | Fixed | Low | F-18 | `docs/INCIDENT_RESPONSE.md` |

## 7. Verification log

| # | Item | Command / test | Expected | Actual | Result |
|---|---|---|---|---|---|
| V1 | Code review | Read all 38 server files, routes, tests, workflows, `index.html`, `sw.js` | - | Findings F-01 to F-20 | Done |
| V2 | Git history | `git log --all -G<patterns>` over 79 commits, 19 branches | No secrets | No API keys or tokens; data file in 8 commits; 3 hardcoded credentials in `5f7aefb` | Findings |
| V3 | Tests | `npm test` | All pass | Before: 52 of 52. After: 76 of 76 (24 new) | Pass |
| V4 | Tests have teeth | Remove each fix, re-run | Tests fail | Login, payment-binding and CORS tests failed, then passed when restored | Pass |
| V5 | Dependencies | `npm audit` (app; gateway front end) | 0 | 0 and 0 | Pass |
| V6 | Dangerous sinks | grep for exec/eval/innerHTML/redirect/query in `server`, `src` | None | None; 3 parameterised SQL statements | Pass |
| V7 | Build | `npm run build` | Succeeds, no maps | Succeeds; 0 `.map` files | Pass |
| V8 | Bundle contents | grep bundle for secret names | 0 | 0 for all secret names | Pass |
| V9 | HTTPS and headers (live) | `curl -I` | 301, HSTS, CSP | 301; HSTS yes; nosniff yes; **no CSP** | F-08 |
| V10 | CORS (live) | `curl -H "Origin: https://attacker.example"` | Not echoed | **Echoed with credentials** | F-06 |
| V11 | CSP in browser (local production build) | Visit 20 pages, listen for violations | 0 | 0 after fixing a line-ending hash bug the browser check caught | Pass |
| V12 | Production mode (live) | `GET /api/payments/config` | Not test mode | `testMode: false`; `provider: mock` | F-11 |
| V13 | Sensitive paths (live) | GET 16 paths (`/.env`, `/.git/config`, ...) | No content | App shell only (no file content); no source map | Pass; F-16 |
| V14 | DNS | `nslookup` A, CNAME, MX, TXT, `_dmarc` | SPF, DMARC | `www` -> live Render service; no SPF/DMARC | F-17 |
| V15 | Secret-scan workflow | YAML parsed | Valid | Valid; first run happens on the PR | Pass |

## 8. Change log

| Commit | Change |
|---|---|
| `de265b7` | Auth: remove login bypass, built-in credentials, fallback secret; password change with session revocation |
| `e4d2854` | Payments: bind gateway results to order and amount; rate limits; delivery switch |
| `ef84b47` | HTTP: CORS allow-list, host validation, CSP, proxy trust, 404 for file-like paths |
| `a498a83` | 24 regression tests; secret-scan workflow; ignore rules |
| (this commit) | This report and `docs/INCIDENT_RESPONSE.md` |

A PDF version of this report was not produced (skipped at the owner's request to keep the work small).
