export interface SpeakOutSettings {
	enableDataAttributeMarkers: boolean;
	enableLinkMarkers: boolean;
	speechEngineId: string;
	voiceEngineId: string;
	voiceId: string;
}

export const DEFAULT_SETTINGS: SpeakOutSettings = {
	enableDataAttributeMarkers: true,
	enableLinkMarkers: true,
	speechEngineId: '',
	voiceEngineId: '',
	voiceId: '',
};

export function normalizeSettings(data: unknown): SpeakOutSettings {
	const persistedSettings = isSettingsRecord(data) ? data : {};

	return {
		...normalizeMarkerSettings(persistedSettings),
		speechEngineId: getStringSetting(persistedSettings.speechEngineId),
		voiceEngineId: getStringSetting(persistedSettings.voiceEngineId),
		voiceId: getStringSetting(persistedSettings.voiceId),
	};
}

export function normalizeMarkerSettings(
	settings: Partial<Record<keyof SpeakOutSettings, unknown>>,
): Pick<SpeakOutSettings, 'enableDataAttributeMarkers' | 'enableLinkMarkers'> {
	const normalizedSettings = {
		enableDataAttributeMarkers: getBooleanSetting(
			settings.enableDataAttributeMarkers,
			DEFAULT_SETTINGS.enableDataAttributeMarkers,
		),
		enableLinkMarkers: getBooleanSetting(
			settings.enableLinkMarkers,
			DEFAULT_SETTINGS.enableLinkMarkers,
		),
	};

	if (
		!normalizedSettings.enableDataAttributeMarkers &&
		!normalizedSettings.enableLinkMarkers
	) {
		return {
			enableDataAttributeMarkers: true,
			enableLinkMarkers: false,
		};
	}

	return normalizedSettings;
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

function getBooleanSetting(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}
