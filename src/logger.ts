const LOG_PREFIX = '[Speak Out]';
const TEXT_PREVIEW_LENGTH = 120;

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
		preview: getTextPreview(text),
	};
}

function getTextPreview(text: string): string {
	const normalizedText = text.replace(/\s+/g, ' ').trim();

	if (normalizedText.length <= TEXT_PREVIEW_LENGTH) {
		return normalizedText;
	}

	return `${normalizedText.slice(0, TEXT_PREVIEW_LENGTH)}...`;
}
