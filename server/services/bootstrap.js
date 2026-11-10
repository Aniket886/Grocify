import bcrypt from 'bcryptjs';

// Passwords that earlier versions of this project wrote into source code. They are public knowledge to
// anyone who has seen the repository, so they are treated as a deny-list: never accepted as a new
// password, and any account still using one is reported (and repaired when a real password is configured).
export const KNOWN_DEFAULT_PASSWORDS = ['Admin@123', 'aniket123'];
const LEGACY_ADMIN_EMAIL = 'admin@grocify.test';

export const isKnownDefaultPassword = (value) => typeof value === 'string' && KNOWN_DEFAULT_PASSWORDS.includes(value);

async function usesKnownDefault(user) {
  for (const p of KNOWN_DEFAULT_PASSWORDS) {
    if (await bcrypt.compare(p, user.passwordHash || '')) return true;
  }
  return false;
}

/**
 * Makes sure an admin account exists, using ONLY credentials supplied through the environment
 * (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD). Nothing is created from a built-in default.
 *
 * Returns { created, rotated, atRisk } so the caller (and the tests) can see what happened.
 *  - created: an admin account was created from the environment credentials
 *  - rotated: ids of admin accounts whose known default password was replaced by the configured one
 *  - atRisk:  ids of accounts that still use a known default password and could not be repaired
 */
export async function ensureAccounts({ store, env, logger }) {
  const result = { created: false, rotated: [], atRisk: [] };
  const configured = Boolean(env.seedAdminEmail && env.seedAdminPassword);
  const strongEnough = configured && env.seedAdminPassword.length >= 8 && !isKnownDefaultPassword(env.seedAdminPassword);

  if (configured && !strongEnough) {
    logger.error('SEED_ADMIN_PASSWORD is too short or is a known default password; no admin account was created or changed');
  }

  if (strongEnough) {
    const existing = await store.findUserByEmail(env.seedAdminEmail);
    if (!existing) {
      await store.createUser({ name: 'Admin', email: env.seedAdminEmail, phone: '', role: 'admin', passwordHash: await bcrypt.hash(env.seedAdminPassword, 10) });
      result.created = true;
      logger.info('Admin account created from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD');
    }
  } else if (!(await store.listAdmins()).length) {
    logger.warn('No admin account exists. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (8+ characters) and restart to create one.');
  }

  // Repair or report accounts that still carry a password that used to be hardcoded in the source.
  for (const user of await store.listUsers()) {
    if (!(await usesKnownDefault(user))) continue;
    const isSeedAdmin = user.role === 'admin' && [env.seedAdminEmail, LEGACY_ADMIN_EMAIL].includes(user.email);
    if (strongEnough && isSeedAdmin) {
      await store.updateUser(user.id, { passwordHash: await bcrypt.hash(env.seedAdminPassword, 10), tokenVersion: (user.tokenVersion || 0) + 1 });
      result.rotated.push(user.id);
      logger.warn('An admin account was still using a default password; it now uses SEED_ADMIN_PASSWORD and its sessions were signed out', { userId: user.id });
    } else {
      result.atRisk.push(user.id);
      logger.error('SECURITY: this account still uses a publicly known default password. Change it now.', { userId: user.id, role: user.role });
    }
  }
  return result;
}
