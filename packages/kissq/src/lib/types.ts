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
