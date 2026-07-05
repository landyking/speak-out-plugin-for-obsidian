export interface SpeakOutSettings {
	speechEngineId: string;
	voiceEngineId: string;
	voiceId: string;
}

export const DEFAULT_SETTINGS: SpeakOutSettings = {
	speechEngineId: '',
	voiceEngineId: '',
	voiceId: '',
};

export function getVoiceSelectionValue(settings: SpeakOutSettings): string {
	if (!settings.voiceEngineId || !settings.voiceId) {
		return '';
	}

	return JSON.stringify([settings.voiceEngineId, settings.voiceId]);
}

export function parseVoiceSelectionValue(
	value: string,
): Pick<SpeakOutSettings, 'voiceEngineId' | 'voiceId'> {
	if (!value) {
		return {
			voiceEngineId: '',
			voiceId: '',
		};
	}

	try {
		const parsedValue = JSON.parse(value) as unknown;
		if (
			Array.isArray(parsedValue) &&
			typeof parsedValue[0] === 'string' &&
			typeof parsedValue[1] === 'string'
		) {
			return {
				voiceEngineId: parsedValue[0],
				voiceId: parsedValue[1],
			};
		}
	} catch {
		// Fall through to reset invalid persisted UI values.
	}

	return {
		voiceEngineId: '',
		voiceId: '',
	};
}

export function getVoiceOptionValue(engineId: string, voiceId: string): string {
	return JSON.stringify([engineId, voiceId]);
}
