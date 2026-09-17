import { createContext } from 'svelte';
import Toastify from 'toastify-js';
import { connectToSerialPort, readFromSerialPort } from '$lib/serial';
import type { GameClassBaseType } from './game';
import type { AttendantID, ButtonID } from './types';

export class WasedashikiClass {
	serialPort = $state<SerialPort | undefined>();
	answerers = $state<({ currentRank: 1 | 2 | 'late'; totalRank: number; delay: number } | null)[]>(
		[]
	);
	lastButtonID = $state<ButtonID | undefined>();
	/** attendant ID -> button ID */
	buttonMapping = $state<Record<AttendantID, ButtonID>>({});
	buttonMappingRestored = $state(false);
	connected = $state(false);
	pushers = $state<ButtonID[]>([]);
	cursor = $state(0);

	lastBatsuButtonTime = -Infinity;

	constructor(public Game: GameClassBaseType) {}

	/** button ID -> attendant ID */
	buttonReverseMapping = $derived.by(() => {
		const reverse: Record<ButtonID, AttendantID> = {};
		for (const [attendantID, buttonID] of Object.entries(this.buttonMapping)) {
			reverse[buttonID as ButtonID] = Number(attendantID) as AttendantID;
		}
		return reverse;
	});

	answererRanking = $derived(
		Object.entries(this.answerers)
			.filter(([, v]) => v != null)
			.toSorted((a, b) => a[1]!.delay - b[1]!.delay)
			.map(([k, v]) => [this.buttonReverseMapping[(Number(k) + 1) as ButtonID], v!] as const)
	);

	async initiateSerialConnection(serialPort_?: SerialPort) {
		if (!serialPort_) {
			try {
				this.serialPort = await connectToSerialPort();
			} catch (error) {
				if (String(error).includes('The port is already open.')) {
					Toastify({ text: '既に接続済みです。' }).showToast();
				} else {
					Toastify({
						text: '接続に失敗しました。2つ以上のタブで同時に接続しようとしていませんか？',
						style: { background: '#B00000' }
					}).showToast();
				}
				console.error('接続エラー', error);
				this.serialPort = undefined;
				this.Game.wasedashikiMode = undefined;
				this.connected = false;
				return;
			}
		}

		while (this.serialPort) {
			console.log('Reading from serial port...');
			setTimeout(() => {
				if (!this.connected) {
					this.serialPort = undefined;
				}
			}, 2500);
			await this.readLoopSerialPort(this.serialPort);
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	async readLoopSerialPort(serialPort: SerialPort | undefined) {
		if (!serialPort) {
			return;
		}

		try {
			for await (const line of readFromSerialPort(serialPort)) {
				this.connected = true;

				console.log('Received line:', JSON.stringify(line));

				if (
					line === '' ||
					/^[^0-9]+ \d+$/.test(line) ||
					line.includes('QUIZ') ||
					line.includes('NAKUI')
				) {
					continue;
				}

				switch (line) {
					case '91':
						Toastify({ text: '接続完了（シングルチャンス）' }).showToast();
						this.Game.wasedashikiMode = 'single';
						continue;
					case '92':
						Toastify({ text: '接続完了（ダブルチャンス）' }).showToast();
						this.Game.wasedashikiMode = 'double';
						continue;
					case '93':
						Toastify({ text: '接続完了（エンドレスチャンス）' }).showToast();
						this.Game.wasedashikiMode = 'endless';
						continue;
					case '94':
						Toastify({ text: '接続完了（ハンデあり）' }).showToast();
						this.Game.wasedashikiMode = 'handicap';
						continue;
					case '99':
						// リセット
						this.answerers = [];
						this.pushers = [];
						this.cursor = 0;
						continue;
				}

				if (line === '51' || line === '52') {
					if (this.Game.bulkAdjustmentScore !== null) {
						this.Game.bulkAdjust();
					} else {
						const answererButtonID = this.answerers.findIndex((a) => a?.currentRank === 1);
						if (answererButtonID === -1) {
							// 空押し

							if (line === '52') {
								const currentTime = Date.now();
								if (currentTime - this.lastBatsuButtonTime <= 1000) {
									this.lastBatsuButtonTime = -Infinity;
									Toastify({ text: 'スルーにします' }).showToast();
									this.Game.clickThrough();

									continue;
								}
								this.lastBatsuButtonTime = currentTime;
							}

							continue;
						}

						const answererAttendantID = Object.entries(this.buttonMapping).find(
							([, id]) => id === answererButtonID + 1
						)?.[0];
						if (answererAttendantID !== undefined) {
							if (line === '51') {
								this.Game.clickMaru(Number.parseInt(answererAttendantID), false);
								this.answerers = [];
							} else {
								this.Game.clickBatsu(Number.parseInt(answererAttendantID), false);
							}
						} else {
							Toastify({
								text: `ボタン ${answererButtonID + 1} を持っているのがどのプレイヤーか分かりません。紐づけしてください`
							}).showToast();
						}
					}

					continue;
				}

				const parts = line.split(' ').map((n) => Number.parseInt(n));
				if (parts.length === 1 && 1 <= parts[0] && parts[0] <= 32) {
					if (this.Game.bulkAdjustmentScore === null) {
						++this.cursor;
						this.lastButtonID = parts[0] as ButtonID;
						this.answerers = Array.from({ length: 32 }, (_, i) =>
							i === parts[0] - 1
								? this.answerers[i]?.delay
									? {
											currentRank: 1,
											totalRank: this.answerers[i].totalRank,
											delay: this.answerers[i].delay
										}
									: { currentRank: 1, totalRank: 0, delay: 0 }
								: this.answerers[i]?.currentRank === 1
									? null
									: this.pushers[this.cursor] - 1 === i
										? {
												currentRank: 2,
												totalRank: this.answerers[i]!.totalRank,
												delay: this.answerers[i]!.delay
											}
										: this.answerers[i]
						);
						const attendantID = Object.entries(this.buttonMapping).find(
							([, id]) => id === this.lastButtonID!
						)?.[0];
						if (attendantID == undefined) {
							Toastify({
								text: `ボタン ${this.lastButtonID} を持っているのがどのプレイヤーか分かりません。紐づけしてください`
							}).showToast();
						} else {
							const att = this.Game.currentState.attendants[Number.parseInt(attendantID)];
							const name = att.name || `プレイヤー${Number.parseInt(attendantID) + 1}`;
							switch (att.life) {
								case 'removed':
									Toastify({ text: `${name}は削除されています` }).showToast();
									break;
								case 'won':
									Toastify({ text: `${name}は勝ち抜け済みです` }).showToast();
									break;
								case 'lost':
									Toastify({ text: `${name}は失格済み・封鎖中です` }).showToast();
									break;
							}
						}
					}
				} else if (parts.length === 2 && 101 <= parts[0] && parts[0] <= 132) {
					if (this.Game.bulkAdjustmentScore !== null) {
						const answererAttendantID = Object.entries(this.buttonMapping).find(
							([, id]) => id === parts[0] - 100
						)?.[0];
						if (answererAttendantID !== undefined) {
							this.Game.addBulkAdjustmentTarget(Number.parseInt(answererAttendantID));
						}
					} else {
						let rank: 1 | 2 | 'late' = 'late';
						if (parts[1] === 0) {
							rank = 1;
						} else if (this.pushers.length === 1) {
							rank = 2;
						}
						this.pushers.push((parts[0] - 100) as ButtonID);

						this.answerers = Array.from({ length: 32 }, (_, i) =>
							i === parts[0] - 101 && parts[1] > 0
								? { currentRank: rank, totalRank: this.pushers.length - 1, delay: parts[1] }
								: this.answerers[i]
						);
					}
				} else {
					Toastify({ text: `デバッグ情報: ${JSON.stringify(line)}` }).showToast();
					console.warn('serial:', JSON.stringify(line));
				}
			}
		} catch (error) {
			Toastify({
				text: String(error).includes('The device has been lost.') ? '切断されました' : '通信エラー',
				style: { background: '#B00000' }
			}).showToast();
			console.error('通信エラー', error);
			this.serialPort = undefined;
			this.Game.wasedashikiMode = undefined;
		}
	}
}

export const [getWasedashikiContext, setWasedashikiContext] = createContext<WasedashikiClass>();
