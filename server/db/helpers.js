/** created_at / updated_at بنوع DATETIME مع تحديث تلقائي */
export function timestamps(knex, t) {
  t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  t.datetime('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
}
