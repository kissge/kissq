export type AttendantID = number & { __attendantIDBrand: never };
export function AttendantID(value: number) {
	return value as AttendantID;
}

export type TeamID = number & { __teamIDBrand: never };
export function TeamID(value: number) {
	return value as TeamID;
}

/** 1-indexed */
export type ButtonID = number & { __buttonIDBrand: never };
export function ButtonID(value: number) {
	return value as ButtonID;
}

export const THROUGH = '[[through]]';
export type THROUGH = typeof THROUGH;

type StripArrayMember<T> = {
	[
		K in keyof T as number extends K
			? never
			: K extends 'at' | 'filter' | 'flat' | 'flatMap' | 'forEach' | 'map'
				? never
				: K
	]: T[K];
};

export type BrandedArray<T, Index extends number> = StripArrayMember<Array<T>> & {
	[K in Index]: T;
} & {
	at(index: Index): T | undefined;
	filter(
		callbackfn: (value: T, index: Index, array: BrandedArray<T, Index>) => unknown
	): BrandedArray<T, Index>;
	flat(): BrandedArray<T extends Array<infer U> ? U : T, Index>;
	flatMap<U>(
		callbackfn: (value: T, index: Index, array: BrandedArray<T, Index>) => U | ReadonlyArray<U>
	): U[];
	forEach(
		callbackfn: (value: T, index: Index, array: BrandedArray<T, Index>) => void,
		thisArg?: any
	): void;
	map<U, SimpleArray extends boolean = false>(
		callbackfn: (value: T, index: Index, array: BrandedArray<T, Index>) => U,
		thisArg?: any
	): SimpleArray extends true ? U[] : BrandedArray<U, Index>;
};
export function BrandedArray<T, Index extends number>(arr: T[]): BrandedArray<T, Index> {
	return arr as BrandedArray<T, Index>;
}
