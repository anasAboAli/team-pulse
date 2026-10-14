import { timestamps } from '../helpers.js';

export async function up(knex) {
  await knex.schema.createTable('evaluation_criteria', (t) => {
    t.increments('id');
    t.string('name', 100).notNullable();
    t.string('description', 255);
    t.decimal('weight', 4, 2).notNullable().defaultTo(1);
    t.boolean('is_active').notNullable().defaultTo(true);
    timestamps(knex, t);
  });

  await knex.schema.createTable('evaluations', (t) => {
    t.increments('id');
    t.integer('evaluatee_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('evaluator_id').unsigned().notNullable().references('id').inTable('users');
    t.enu('period_type', ['monthly', 'quarterly', 'yearly']).notNullable().defaultTo('monthly');
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.decimal('overall_score', 4, 2).notNullable();
    t.text('notes');
    timestamps(knex, t);
    t.unique(['evaluatee_id', 'evaluator_id', 'period_type', 'period_start'], { indexName: 'evaluations_period_unique' });
    t.index(['period_start']);
  });

  await knex.schema.createTable('evaluation_scores', (t) => {
    t.increments('id');
    t.integer('evaluation_id').unsigned().notNullable().references('id').inTable('evaluations').onDelete('CASCADE');
    t.integer('criterion_id').unsigned().notNullable().references('id').inTable('evaluation_criteria');
    t.tinyint('score').unsigned().notNullable();
    t.unique(['evaluation_id', 'criterion_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('evaluation_scores');
  await knex.schema.dropTableIfExists('evaluations');
  await knex.schema.dropTableIfExists('evaluation_criteria');
}
