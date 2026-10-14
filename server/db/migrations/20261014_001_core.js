import { timestamps } from '../helpers.js';

export async function up(knex) {
  await knex.schema.createTable('company_settings', (t) => {
    t.increments('id');
    t.string('name', 150).notNullable();
    t.string('logo_path', 255);
    t.string('email', 150);
    t.string('phone', 50);
    t.string('website', 150);
    t.string('address', 255);
    t.text('description');
    t.date('founded_at');
    timestamps(knex, t);
  });

  await knex.schema.createTable('departments', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable().unique();
    t.text('description');
    // BR-01: مدير واحد لكل قسم، ولا يرأس المدير أكثر من قسم
    t.integer('manager_id').unsigned().nullable().unique();
    timestamps(knex, t);
    t.datetime('deleted_at');
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('full_name', 150).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['admin', 'manager', 'employee']).notNullable().defaultTo('employee');
    t.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.string('job_title', 120);
    t.string('phone', 40);
    t.string('avatar_path', 255);
    t.date('hire_date');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('must_change_password').notNullable().defaultTo(true);
    t.datetime('last_login_at');
    timestamps(knex, t);
    t.datetime('deleted_at');
    t.index(['role']);
  });

  await knex.schema.alterTable('departments', (t) => {
    t.foreign('manager_id').references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.schema.createTable('refresh_tokens', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 64).notNullable().unique();
    t.string('user_agent', 255);
    t.datetime('expires_at').notNullable();
    t.datetime('revoked_at');
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.alterTable('departments', (t) => t.dropForeign(['manager_id']));
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('departments');
  await knex.schema.dropTableIfExists('company_settings');
}
