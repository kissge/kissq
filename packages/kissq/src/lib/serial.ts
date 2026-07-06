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

			yield* lines;
		}
	} finally {
		reader.releaseLock();
	}
}
