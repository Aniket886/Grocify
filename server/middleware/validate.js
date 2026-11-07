// Small input validators. Each throws a 400 error with a clear message.
export const badRequest = (message, status = 400) => Object.assign(new Error(message), { status });

export function text(value, field, { min = 1, max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw badRequest(`${field} is required`);
  }
  if (typeof value !== 'string') throw badRequest(`${field} must be text`);
  const v = value.trim();
  if (v.length < min) throw badRequest(`${field} must be at least ${min} characters`);
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return v;
}

export function email(value) {
  const v = text(value, 'Email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw badRequest('Enter a valid email address');
  return v;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8) throw badRequest('Password must be at least 8 characters');
  if (value.length > 100) throw badRequest('Password is too long');
  return value;
}

export function number(value, field, { min = 0, integer = false } = {}) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) throw badRequest(`${field} must be a number`);
  if (integer && !Number.isInteger(n)) throw badRequest(`${field} must be a whole number`);
  if (n < min) throw badRequest(`${field} must be at least ${min}`);
  return n;
}
