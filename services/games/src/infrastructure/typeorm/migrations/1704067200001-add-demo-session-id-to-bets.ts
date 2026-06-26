import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddDemoSessionIdToBets1704067200001 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			"bets",
			new TableColumn({
				name: "demoSessionId",
				type: "varchar",
				length: "36",
				isNullable: true,
			}),
		);

		await queryRunner.createIndex(
			"bets",
			new TableIndex({
				name: "idx_bets_demoSessionId",
				columnNames: ["demoSessionId"],
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropIndex("bets", "idx_bets_demoSessionId");
		await queryRunner.dropColumn("bets", "demoSessionId");
	}
}
