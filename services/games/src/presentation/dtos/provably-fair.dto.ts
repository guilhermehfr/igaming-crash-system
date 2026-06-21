export interface ProvablyFairStatusDto {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

export interface ProvablyFairRevealDto {
	serverSeed: string;
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

export class SetClientSeedDto {
	clientSeed!: string;
}
