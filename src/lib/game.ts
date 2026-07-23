import type { WasedashikiMode } from './serial';
import type { GameState } from './state';

export abstract class GameClassBase {
	abstract currentState: GameState;
	abstract wasedashikiMode: WasedashikiMode | undefined;
	abstract clickMaru(attendantID: number, playSounds_?: boolean): void;
	abstract clickBatsu(attendantID: number, playSounds_?: boolean): Promise<void>;
}
