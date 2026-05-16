import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConsumedEvents1747334400000 implements MigrationInterface {
  name = 'CreateConsumedEvents1747334400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "consumed_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" varchar(255) NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "user_id" varchar(255) NOT NULL,
        "processed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_consumed_events_event_id" UNIQUE ("event_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consumed_events_event_id" ON "consumed_events" ("event_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consumed_events_user_id" ON "consumed_events" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_consumed_events_event_type" ON "consumed_events" ("event_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "consumed_events"`);
  }
}