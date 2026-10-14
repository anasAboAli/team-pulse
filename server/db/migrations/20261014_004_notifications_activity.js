export async function up(knex) {
  await knex.schema.createTable('notifications', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 50).notNullable();
    t.string('title', 200).notNullable();
    t.string('body', 500);
    t.string('link', 255);
    t.datetime('read_at');
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'read_at']);
  });

  await knex.schema.createTable('activity_logs', (t) => {
    t.increments('id');
    t.integer('actor_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 60).notNullable();
    t.string('entity_type', 40).notNullable();
    t.integer('entity_id').unsigned();
    t.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.json('meta');
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['department_id', 'created_at']);
    t.index(['created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('notifications');
}
