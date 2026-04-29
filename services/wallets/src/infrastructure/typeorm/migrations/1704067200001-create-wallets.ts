import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * CreateWallets Migration
 * 
 * Creates the schema for:
 * - wallets table: Stores user wallet balances with BigInt precision
 */
export class CreateWallets1704067200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'balanceInCentavos',
            type: 'bigint',
            default: 0,
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
            name: 'idx_wallets_userId',
            columnNames: ['userId'],
            isUnique: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wallets', true);
  }
}
