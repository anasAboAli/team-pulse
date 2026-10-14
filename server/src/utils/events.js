import { db } from '../config/db.js';

/** يسجّل عملية في سجل النشاط */
export async function logActivity(conn, { actor, action, entityType, entityId = null, departmentId = null, meta = null }) {
  await (conn || db)('activity_logs').insert({
    actor_id: actor?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    department_id: departmentId,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

/** يرسل إشعاراً داخلياً لمستخدم أو أكثر (مع استبعاد الفاعل نفسه) */
export async function notify(conn, userIds, { type, title, body = null, link = null, exclude = null }) {
  const ids = [...new Set([].concat(userIds).filter((id) => id && id !== exclude))];
  if (!ids.length) return;
  await (conn || db)('notifications').insert(ids.map((user_id) => ({ user_id, type, title, body, link })));
}
