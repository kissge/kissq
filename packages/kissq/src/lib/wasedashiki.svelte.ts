import { createContext } from 'svelte';
import Toastify from 'toastify-js';
import { connectToSerialPort, readFromSerialPort } from '$lib/serial';
import type { GameClassBase } from './game';

export class WasedashikiClass {
	serialPort = $state<SerialPort | undefined>();
	answerers = $state<({ rank: 1 | 2 | 'late'; delay: number } | null)[]>([]);
	lastButtonID = $state<number | undefined>();
	/** attendant ID -> button ID */
	buttonMapping = $state<Record<number, number>>({});
	buttonMappingRestored = $state(false);
	connected = $state(false);
	pushers = $state<number[]>([]);

	constructor(public Game: GameClassBase<'single'> | GameClassBase<'team'>) {}

	/** button ID -> attendant ID */
	buttonReverseMapping = $derived.by(() => {
		const reverse: Record<number, number> = {};
		for (const [attendantID, buttonID] of Object.entries(this.buttonMapping)) {
			reverse[buttonID] = Number(attendantID);
		}
		return reverse;
	});

	answererRanking = $derived(
		Object.entries(this.answerers)
			.filter(([, v]) => v != null)
			.toSorted((a, b) => a[1]!.delay - b[1]!.delay)
			.map(([k, v]) => [this.buttonReverseMapping[Number(k) + 1], v!] as const)
	);

	async initiateSerialConnection(serialPort_?: SerialPort) {
		if (!serialPort_) {
			try {
				this.serialPort = await connectToSerialPort();
			} catch (error) {
				Toastify({
					text: '接続に失敗しました。2つ以上のタブで同時に接続しようとしていませんか？',
					style: { background: '#B00000' }
				}).showToast();
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

				if (
					line === '' ||
					/.+ 24/.test(line) ||
					line.startsWith('WASEDA') ||
					line.startsWith('Copyright')
				) {
					continue;
				}

				console.log('Received line:', JSON.stringify(line));

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
						continue;
				}

				if (line === '51' || line === '52') {
					const answererButtonID = this.answerers.findIndex((a) => a?.rank === 1);
					if (answererButtonID === -1) {
						// 空押し
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

					continue;
				}

				const parts = line.split(' ').map((n) => Number.parseInt(n));
				if (parts.length === 1 && 1 <= parts[0] && parts[0] <= 24) {
					this.lastButtonID = parts[0];
					this.pushers.shift();
					const second = this.pushers[0];
					this.answerers = Array.from({ length: 24 }, (_, i) =>
						i === parts[0] - 1
							? this.answerers[i]?.delay
								? { rank: 1, delay: this.answerers[i].delay }
								: { rank: 1, delay: 0 }
							: this.answerers[i]?.rank === 1
								? null
								: i + 1 === second
									? { rank: 2, delay: this.answerers[i]!.delay }
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
				} else if (parts.length === 2 && 101 <= parts[0] && parts[0] <= 124) {
					let rank: 1 | 2 | 'late' = 'late';
					if (parts[1] === 0) {
						rank = 1;
					} else {
						if (this.pushers.length === 0) {
							rank = 2;
						}
						this.pushers.push(parts[0] - 100);
					}

					this.answerers = Array.from({ length: 24 }, (_, i) =>
						i === parts[0] - 101 && parts[1] > 0 ? { rank, delay: parts[1] } : this.answerers[i]
					);
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
