import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddDemoSessionId1747364400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'wallets',
      new TableColumn({
        name: 'demoSessionId',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    await queryRunner.dropIndex('wallets', 'idx_wallets_userId');

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'idx_wallets_userId_demoSessionId',
        columnNames: ['userId', 'demoSessionId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('wallets', 'idx_wallets_userId_demoSessionId');

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'idx_wallets_userId',
        columnNames: ['userId'],
        isUnique: true,
      }),
    );

    await queryRunner.dropColumn('wallets', 'demoSessionId');
  }
}
