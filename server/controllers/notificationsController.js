import * as store from '../data/localStore.js';
import { badRequest } from '../middleware/validate.js';

export async function list(req, res) {
  const notifications = await store.listNotifications(req.user.id);
  res.json({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
}

// Another customer's notification looks the same as a missing one.
export async function markRead(req, res) {
  const n = await store.markNotificationRead(req.user.id, req.params.id);
  if (!n) throw badRequest('Notification not found', 404);
  res.json({ notification: n });
}

export async function markAllRead(req, res) {
  await store.markAllNotificationsRead(req.user.id);
  res.json({ unreadCount: 0 });
}
