# Grocify: Incident Response Plan

Use this when a secret leaks, an account is taken over, or the site behaves as if it has been tampered with. Work top to bottom.

## 1. Contain (first 15 minutes)
- **Leaked secret** (token secret, admin password, database URL, gateway key): rotate it **at the provider first**, then update the Render environment variable. Deleting it from code or Git does not make it safe.
- **Token secret leaked or admin compromised:** set a new `JWT_SECRET` on Render and redeploy. Every session is signed out.
- **One account compromised:** change its password (`PUT /api/auth/password`); this signs out its other sessions.
- **Payment problem:** set `PAYMENT_PROVIDER=mock` to stop real payments while you investigate.

## 2. Redeploy and confirm
- Redeploy from `main`. Check `GET /api/health` and log in.
- Confirm the old secret no longer works (the old token or password is refused).

## 3. Investigate
- Render logs: search for `Login failed`, `Access denied`, `SECURITY`, `Webhook rejected`, `does not match this order`. Each line has a `requestId`; search that id to see the whole request.
- Check the admin Orders and Payments screens for orders marked paid without a matching payment.
- Run the secret scan: GitHub, Actions, "Secret scan", Run workflow.

## 4. Recover
- Restore data from the database provider's backup if records were changed.
- Fix the cause on a branch with a test, open a pull request, review, merge.

## 5. Notify
- Tell affected users what happened and what to do (change password).
- If personal data was exposed, check your duties under the Digital Personal Data Protection Act 2023 (notify the Data Protection Board and affected people).

## 6. Record
Write down: what happened, when it was noticed, what was rotated, what was changed, and what will prevent it next time. Keep it with the project documents (not in the public site).

## Contacts
- Owner: [FILL: name and phone]
- Hosting: Render dashboard
- Domain and DNS: Hostinger
- Database: [FILL: provider]
