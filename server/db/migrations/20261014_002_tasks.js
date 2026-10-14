import { timestamps } from '../helpers.js';

export async function up(knex) {
  await knex.schema.createTable('tasks', (t) => {
    t.increments('id');
    t.string('title', 200).notNullable();
    t.text('description');
    t.integer('assignee_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('assigned_by').unsigned().notNullable().references('id').inTable('users');
    // قسم الموظف لحظة الإسناد (BR-06)
    t.integer('department_id').unsigned().nullable().references('id').inTable('departments').onDelete('SET NULL');
    t.enu('priority', ['low', 'medium', 'high', 'urgent']).notNullable().defaultTo('medium');
    t.enu('status', ['new', 'in_progress', 'submitted', 'completed', 'returned', 'cancelled'])
      .notNullable()
      .defaultTo('new');
    t.boolean('requires_attachment').notNullable().defaultTo(false);
    t.date('due_date');
    t.datetime('submitted_at');
    t.datetime('completed_at');
    timestamps(knex, t);
    t.datetime('deleted_at');
    t.index(['assignee_id', 'status']);
    t.index(['department_id', 'status']);
    t.index(['due_date']);
  });

  await knex.schema.createTable('task_attachments', (t) => {
    t.increments('id');
    t.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    t.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users');
    t.string('original_name', 255).notNullable();
    t.string('stored_name', 100).notNullable();
    t.string('mime_type', 120);
    t.integer('size_bytes').unsigned().notNullable();
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('task_comments', (t) => {
    t.increments('id');
    t.integer('task_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    t.text('body').notNullable();
    t.boolean('is_system').notNullable().defaultTo(false);
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('task_comments');
  await knex.schema.dropTableIfExists('task_attachments');
  await knex.schema.dropTableIfExists('tasks');
}
