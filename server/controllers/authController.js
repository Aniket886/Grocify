import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import * as store from '../data/localStore.js';
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

const sign = (u) => jwt.sign({ sub: u.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export async function register(req, res) {
  const name = text(req.body.name, 'Name', { max: 80 });
  const mail = email(req.body.email);
  const pass = password(req.body.password);
  const phone = text(req.body.phone, 'Phone', { optional: true, max: 15 });

  if (await store.findUserByEmail(mail)) throw badRequest('An account with this email already exists', 409);

  // Role is always "customer" here. Admins are created only by the seed script.
  const user = await store.createUser({ name, email: mail, phone, passwordHash: await bcrypt.hash(pass, 10), role: 'customer' });
  req.log.info('User registered', { userId: user.id });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}

export async function login(req, res) {
  const mail = email(req.body.email);
  const user = await store.findUserByEmail(mail);
  const ok = user && typeof req.body.password === 'string' && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!ok) {
    req.log.warn('Login failed', { email: mail });
    throw badRequest('Incorrect email or password', 401); // same message for both cases
  }
  req.log.info('Login success', { userId: user.id, role: user.role });
  res.json({ token: sign(user), user: publicUser(user) });
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
