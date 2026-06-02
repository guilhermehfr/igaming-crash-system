import type { Round } from "./round.entity";

export interface IRoundRepository {
	findById(id: string): Promise<Round | null>;

	findMostRecent(): Promise<Round | null>;

	findAll(skip: number, take: number): Promise<Round[]>;

	save(round: Round): Promise<Round>;

	delete(id: string): Promise<boolean>;

	exists(id: string): Promise<boolean>;

	count(): Promise<number>;
}
