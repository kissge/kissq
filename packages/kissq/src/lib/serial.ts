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
			console.error('接続エラー', error);
		}
	}
}

export async function* readFromSerialPort(port: SerialPort) {
	if (!port.readable) {
		return;
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
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				yield line;
			}
		}
	} catch (error) {
		console.error("読み取りエラー", error);
	} finally {
		reader.releaseLock();
	}
}
