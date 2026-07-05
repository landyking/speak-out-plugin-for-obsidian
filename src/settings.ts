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

export function normalizeSettings(data: unknown): SpeakOutSettings {
	const persistedSettings = isSettingsRecord(data) ? data : {};

	return {
		speechEngineId: getStringSetting(persistedSettings.speechEngineId),
		voiceEngineId: getStringSetting(persistedSettings.voiceEngineId),
		voiceId: getStringSetting(persistedSettings.voiceId),
	};
}

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

function isSettingsRecord(
	data: unknown,
): data is Partial<Record<keyof SpeakOutSettings, unknown>> {
	return typeof data === 'object' && data !== null;
}

function getStringSetting(value: unknown): string {
	return typeof value === 'string' ? value : '';
}
