/**
 * ينفّذ استعلام Knex مع ترقيم الصفحات ويعيد { data, meta }.
 * لا يُستخدم مع استعلامات تحتوي groupBy.
 */
export async function paginate(qb, { page = 1, per_page = 15 }, mapRow = (r) => r) {
  const countRow = await qb.clone().clearSelect().clearOrder().count({ total: '*' }).first();
  const total = Number(countRow?.total ?? 0);
  const rows = await qb.limit(per_page).offset((page - 1) * per_page);
  return {
    data: rows.map(mapRow),
    meta: { page, per_page, total, last_page: Math.max(1, Math.ceil(total / per_page)) },
  };
}
