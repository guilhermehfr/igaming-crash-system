import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryColumn,
	type Relation,
	UpdateDateColumn,
} from "typeorm";
import { BetState } from "../../domain/bet.entity";
import { BigIntTransformer } from "./transformers/bigint.transformer";

@Entity("bets")
export class BetTypeormEntity {
	@PrimaryColumn("varchar", { length: 36 })
	id!: string;

	@Column("varchar", { length: 36 })
	roundId!: string;

	@Column("varchar", { length: 255 })
	playerId!: string;

	@Column("bigint", { transformer: BigIntTransformer })
	betAmountInCentavos!: bigint;

	@Column({
		type: "enum",
		enum: BetState,
		default: BetState.PENDING,
	})
	state!: BetState;

	@Column("decimal", { precision: 10, scale: 3, nullable: true })
	cashOutMultiplier!: number | null;

	@Column("bigint", { transformer: BigIntTransformer, nullable: true })
	winningsInCentavos!: bigint | null;

	@Column("decimal", { precision: 10, scale: 3, nullable: true })
	crashPointMultiplier!: number | null;

	@ManyToOne(
		// biome-ignore lint/suspicious/noExplicitAny: circular dependency requires lazy require
		() => require("./round.typeorm-entity").RoundTypeormEntity as any,
		// biome-ignore lint/suspicious/noExplicitAny: TypeORM relation callback
		(round: any) => round.bets,
		{
			onDelete: "CASCADE",
		},
	)
	@JoinColumn({ name: "roundId" })
	// biome-ignore lint/suspicious/noExplicitAny: Relation type from TypeORM circular dependency
	round!: Relation<any>;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
