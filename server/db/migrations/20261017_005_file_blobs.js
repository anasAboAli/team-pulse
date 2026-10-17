/** محتوى الملفات المرفوعة عند STORAGE_DRIVER=db (استضافة بلا قرص دائم مثل Vercel) */
export async function up(knex) {
  await knex.schema.createTable('file_blobs', (t) => {
    t.string('name', 100).primary();
    t.string('mime_type', 120);
    t.specificType('data', 'LONGBLOB').notNullable();
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('file_blobs');
}
