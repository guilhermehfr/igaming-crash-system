import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * CreateRoundsAndBets Migration
 * 
 * Creates the schema for:
 * 1. rounds table: Stores crash game round state
 * 2. bets table: Stores player bets with BigInt precision for amounts
 */
export class CreateRoundsAndBets1704067200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rounds table
    await queryRunner.createTable(
      new Table({
        name: 'rounds',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'state',
            type: 'enum',
            enum: ['BETTING', 'RUNNING', 'CRASHED'],
            default: "'BETTING'",
          },
          {
            name: 'currentMultiplier',
            type: 'decimal',
            precision: 10,
            scale: 3,
            default: 1.0,
          },
          {
            name: 'crashPointMultiplier',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'crashPointHash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'crashPointSeed',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bettingStartedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'gameStartedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'gameEndedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'idx_rounds_state',
            columnNames: ['state'],
          },
          {
            name: 'idx_rounds_createdAt',
            columnNames: ['createdAt'],
          },
        ],
      }),
      true,
    );

    // Create bets table
    await queryRunner.createTable(
      new Table({
        name: 'bets',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'roundId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'playerId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'betAmountInCentavos',
            type: 'bigint',
          },
          {
            name: 'state',
            type: 'enum',
            enum: ['PENDING', 'CASHED_OUT', 'LOST'],
            default: "'PENDING'",
          },
          {
            name: 'cashOutMultiplier',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'winningsInCentavos',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'crashPointMultiplier',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'idx_bets_roundId',
            columnNames: ['roundId'],
          },
          {
            name: 'idx_bets_playerId',
            columnNames: ['playerId'],
          },
          {
            name: 'idx_bets_state',
            columnNames: ['state'],
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'bets',
      new TableForeignKey({
        columnNames: ['roundId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'rounds',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('bets');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('roundId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('bets', foreignKey);
    }

    // Drop tables
    await queryRunner.dropTable('bets', true);
    await queryRunner.dropTable('rounds', true);
  }
}
