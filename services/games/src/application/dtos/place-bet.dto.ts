export class PlaceBetDto {
	constructor(
		readonly userId: string,
		readonly amountInMainUnit: number,
	) {}
}
