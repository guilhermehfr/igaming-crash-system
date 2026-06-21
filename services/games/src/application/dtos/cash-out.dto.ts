export class CashOutDto {
	constructor(
		readonly betId: string,
		readonly multiplier: number,
		readonly userId: string,
	) {}
}
