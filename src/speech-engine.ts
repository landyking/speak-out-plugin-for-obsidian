import {
	BROWSER_ENGINE_ID,
	BrowserSpeechEngine,
	isBrowserSpeechAvailable,
} from './speech-engine/browser';
import {
	SpeechEngine,
	type SpeechEngineOption,
} from './speech-engine/types';
export { SpeechEngine } from './speech-engine/types';
export type {
	SpeechEngineCallbacks,
	SpeechEngineOption,
	SpeechEngineSpeakOptions,
	SpeechVoiceOption,
} from './speech-engine/types';

export function createSpeechEngine(engineId: string): SpeechEngine {
	switch (resolveSpeechEngineId(engineId)) {
		case BROWSER_ENGINE_ID:
		default:
			return new BrowserSpeechEngine();
	}
}

export function resolveSpeechEngineId(engineId: string): string {
	const engineOptions = getSupportedSpeechEngineOptions();
	const selectedEngine = engineOptions.find((option) => option.id === engineId);

	return selectedEngine?.id ?? engineOptions[0]?.id ?? BROWSER_ENGINE_ID;
}

export function getSupportedSpeechEngineOptions(): SpeechEngineOption[] {
	const engineOptions: SpeechEngineOption[] = [];

	if (isBrowserSpeechAvailable()) {
		engineOptions.push({
			id: BROWSER_ENGINE_ID,
			label: 'Browser',
			description: 'Uses the Web Speech API available in Obsidian.',
		});
	}

	return engineOptions;
}
