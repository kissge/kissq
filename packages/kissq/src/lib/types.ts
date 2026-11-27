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
			: K extends 'at' | 'filter' | 'findIndex' | 'flat' | 'flatMap' | 'forEach' | 'map' | 'reduce'
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
	findIndex(callbackfn: (value: T, index: Index, array: BrandedArray<T, Index>) => unknown): Index;
	flat(): (T extends Array<infer U> ? U : T)[];
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
	reduce(
		callbackfn: (
			previousValue: T,
			currentValue: T,
			currentIndex: Index,
			array: BrandedArray<T, Index>
		) => T
	): T;
	reduce<U>(
		callbackfn: (
			previousValue: U,
			currentValue: T,
			currentIndex: Index,
			array: BrandedArray<T, Index>
		) => U,
		initialValue: U
	): U;
};
export function BrandedArray<T, Index extends number>(arr: T[]): BrandedArray<T, Index> {
	return arr as BrandedArray<T, Index>;
}
