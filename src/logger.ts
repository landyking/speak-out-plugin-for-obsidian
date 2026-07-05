const LOG_PREFIX = '[Speak Out]';

export function debugLog(message: string, details?: Record<string, unknown>) {
	if (details === undefined) {
		console.debug(LOG_PREFIX, message);
		return;
	}

	console.debug(LOG_PREFIX, message, details);
}

export function getTextDebugInfo(text: string): Record<string, unknown> {
	return {
		length: text.length,
	};
}
