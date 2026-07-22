import Toastify from 'toastify-js';
import type { AttendantState } from './state';

export type WasedashikiMode = 'single' | 'double' | 'endless' | 'handicap';

export async function connectToSerialPort() {
	try {
		const serial = navigator.serial;
		if (!serial) {
			console.error('Web Serial API is not supported.');
			return;
		}

		const port = await serial.requestPort();
		await port.open({ baudRate: 9600 });
		return port;
	} catch (error) {
		if (String(error).includes('No port selected by the user.')) {
			console.error('ユーザーがポートを選択しませんでした。');
		} else {
			throw error;
		}
	}
}

export async function reconnect() {
	const ports = await navigator.serial.getPorts();

	if (ports.length > 0) {
		const serialPort = ports[0];

		try {
			await serialPort.close();
		} catch {
			/** no-op */
		}

		if (!serialPort.readable) {
			await serialPort.open({ baudRate: 9600 });
			return serialPort;
		}
	}
}

export async function* readFromSerialPort(port: SerialPort) {
	if (!port.readable) {
		throw new Error('The serial port is not readable.');
	}

	const reader = port.readable.getReader();
	let buffer = '';

	try {
		while (true) {
			const { value, done } = await reader.read();

			if (done) {
				break;
			}

			const decoder = new TextDecoder();
			const text = decoder.decode(value);

			buffer += text;
			const lines = buffer.split('\r\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				yield line.trim();
			}
		}
	} finally {
		reader.releaseLock();
	}
}

// DELETE ME
export async function readLoopSerialPort(
	serialPort: SerialPort | undefined,
	getter: () => {
		answerers: ({ rank: 1 | 2 | 'late'; delay: number } | null)[];
		pushers: number[];
		buttonMapping: Record<number, number>;
		attendants: AttendantState[];
		clickMaru: (attendantID: number, playSounds_: boolean) => void;
		clickBatsu: (attendantID: number, playSounds_: boolean) => void;
	},
	setter: (arg: {
		connected?: boolean;
		wasedashikiMode?: WasedashikiMode;
		answerers?: ({ rank: 1 | 2 | 'late'; delay: number } | null)[];
		pushers?: number[];
		lastButtonID?: number;
		serialPort?: SerialPort;
	}) => void
) {
	if (!serialPort) {
		return;
	}

	try {
		for await (const line of readFromSerialPort(serialPort)) {
			setter({ connected: true });

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
					setter({ wasedashikiMode: 'single' });
					continue;
				case '92':
					Toastify({ text: '接続完了（ダブルチャンス）' }).showToast();
					setter({ wasedashikiMode: 'double' });
					continue;
				case '93':
					Toastify({ text: '接続完了（エンドレスチャンス）' }).showToast();
					setter({ wasedashikiMode: 'endless' });
					continue;
				case '94':
					Toastify({ text: '接続完了（ハンデあり）' }).showToast();
					setter({ wasedashikiMode: 'handicap' });
					continue;
				case '99':
					// リセット
					setter({ answerers: [] });
					setter({ pushers: [] });
					continue;
			}

			const { answerers, pushers, buttonMapping, attendants, clickMaru, clickBatsu } = getter();

			if (line === '51' || line === '52') {
				const answererButtonID = answerers.findIndex((a) => a?.rank === 1);
				if (answererButtonID === -1) {
					// 空押し
					continue;
				}

				const answererAttendantID = Object.entries(buttonMapping).find(
					([, id]) => id === answererButtonID + 1
				)?.[0];
				if (answererAttendantID !== undefined) {
					if (line === '51') {
						clickMaru(Number.parseInt(answererAttendantID), false);
						setter({ answerers: [] });
					} else {
						clickBatsu(Number.parseInt(answererAttendantID), false);
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
				const second = pushers[1];
				const lastButtonID = parts[0];
				setter({
					lastButtonID,
					pushers: pushers.slice(1),
					answerers: Array.from({ length: 24 }, (_, i) =>
						i === parts[0] - 1
							? answerers[i]?.delay
								? { rank: 1, delay: answerers[i].delay }
								: { rank: 1, delay: 0 }
							: answerers[i]?.rank === 1
								? null
								: i + 1 === second
									? { rank: 2, delay: answerers[i]!.delay }
									: answerers[i]
					)
				});
				const attendantID = Object.entries(buttonMapping).find(
					([, id]) => id === lastButtonID!
				)?.[0];
				if (attendantID == undefined) {
					Toastify({
						text: `ボタン ${lastButtonID} を持っているのがどのプレイヤーか分かりません。紐づけしてください`
					}).showToast();
				} else {
					const att = attendants[Number.parseInt(attendantID)];
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
					if (pushers.length === 0) {
						rank = 2;
					}
					pushers.push(parts[0] - 100);
				}

				setter({
					answerers: Array.from({ length: 24 }, (_, i) =>
						i === parts[0] - 101 && parts[1] > 0 ? { rank, delay: parts[1] } : answerers[i]
					),
					pushers
				});
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
		setter({ serialPort: undefined, wasedashikiMode: undefined });
	}
}
