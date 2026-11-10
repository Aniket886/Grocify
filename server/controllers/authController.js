import bcrypt from 'bcryptjs';
import * as store from '../data/localStore.js';
import { signToken } from '../middleware/authenticate.js';
import { isKnownDefaultPassword } from '../services/bootstrap.js';
import { badRequest, text, email, password } from '../middleware/validate.js';

// Never send the password hash or internal counters to the client.
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  role: u.role,
  address: u.address || { line: '', city: '', pincode: '' },
});

// Logs enough to investigate a failed login without writing the full address into the log files.
const maskEmail = (mail) => mail.replace(/^(.).*(@.*)$/, '$1***$2');

// A fixed hash to compare against when the account does not exist, so "unknown email" and
// "wrong password" take the same time and cannot be told apart.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function newPassword(value) {
  const pass = password(value);
  if (isKnownDefaultPassword(pass)) throw badRequest('That password is not allowed. Choose a different one.');
  return pass;
}

export async function register(req, res) {
  const name = text(req.body.name, 'Name', { max: 80 });
  const mail = email(req.body.email);
  const pass = newPassword(req.body.password);
  const phone = text(req.body.phone, 'Phone', { optional: true, max: 15 });

  if (await store.findUserByEmail(mail)) throw badRequest('An account with this email already exists', 409);

  // Role is always "customer" here. Admins are created only from SEED_ADMIN_* at startup.
  const user = await store.createUser({ name, email: mail, phone, passwordHash: await bcrypt.hash(pass, 10), role: 'customer' });
  req.log.info('User registered', { userId: user.id });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

// There is exactly one way to log in: the email must exist and the password must match its hash.
// No account is created here and no address is treated specially.
export async function login(req, res) {
  const mail = email(req.body.email);
  const supplied = typeof req.body.password === 'string' ? req.body.password : '';
  const user = await store.findUserByEmail(mail);
  const ok = await bcrypt.compare(supplied, user?.passwordHash || DUMMY_HASH);

  if (!user || !ok) {
    req.log.warn('Login failed', { email: maskEmail(mail) });
    throw badRequest('Incorrect email or password', 401); // same message for both cases
  }
  req.log.info('Login success', { userId: user.id, role: user.role });
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const patch = {
    name: text(req.body.name, 'Name', { max: 80 }),
    phone: text(req.body.phone, 'Phone', { optional: true, max: 15 }),
  };
  if (req.body.address) {
    patch.address = {
      line: text(req.body.address.line, 'Address', { optional: true, max: 200 }),
      city: text(req.body.address.city, 'City', { optional: true, max: 80 }),
      pincode: text(req.body.address.pincode, 'PIN code', { optional: true, max: 10 }),
    };
  }
  const user = await store.updateUser(req.user.id, patch);
  req.log.info('Profile updated', { userId: user.id });
  res.json({ user: publicUser(user) });
}

// Changing the password needs the current one, and signs out every other session by bumping the
// account's token version. A fresh token is returned so this browser stays logged in.
export async function changePassword(req, res) {
  const current = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  if (!(await bcrypt.compare(current, req.user.passwordHash || DUMMY_HASH))) {
    req.log.warn('Password change refused: wrong current password', { userId: req.user.id });
    throw badRequest('Your current password is incorrect', 401);
  }
  const next = newPassword(req.body.newPassword);
  if (next === current) throw badRequest('The new password must be different from the current one');

  const user = await store.updateUser(req.user.id, {
    passwordHash: await bcrypt.hash(next, 10),
    tokenVersion: (req.user.tokenVersion || 0) + 1,
  });
  req.log.info('Password changed; other sessions signed out', { userId: user.id });
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function deleteAccount(req, res) {
  const confirmText = req.body?.confirmText;
  if (typeof confirmText !== 'string' || confirmText.trim().toUpperCase() !== 'DELETE') {
    throw badRequest('Please enter DELETE to confirm permanent account deletion', 400);
  }
  const ok = await store.deleteUser(req.user.id);
  if (!ok) throw badRequest('Account could not be found', 404);
  req.log.info('Account deleted permanently', { userId: req.user.id });
  res.json({ ok: true, message: 'Your account has been permanently deleted' });
}
