import { Notice } from 'obsidian';
import {
	createSpeechEngine,
	getSupportedSpeechEngineOptions,
	resolveSpeechEngineId,
	type SpeechEngine,
	type SpeechEngineOption,
	type SpeechVoiceOption,
} from './speech-engine';
import { debugLog, getTextDebugInfo } from './logger';
import type { SpeakOutSettings } from './settings';

type SpeechVoiceSelection = Pick<SpeakOutSettings, 'voiceEngineId' | 'voiceId'>;

export class SpeechService {
	private speechEngine: SpeechEngine;
	private speechRequestId = 0;

	constructor(
		private readonly settings: SpeakOutSettings,
		speechEngine: SpeechEngine = createSpeechEngine(settings.speechEngineId),
	) {
		this.speechEngine = speechEngine;
	}

	speak(text: string) {
		this.speakWithVoice(text, {
			voiceEngineId: this.settings.voiceEngineId,
			voiceId: this.settings.voiceId,
		});
	}

	previewVoice(text: string, voiceSelection: SpeechVoiceSelection) {
		this.speakWithVoice(text, voiceSelection);
	}

	private speakWithVoice(text: string, voiceSelection: SpeechVoiceSelection) {
		debugLog('Speech requested.', getTextDebugInfo(text));

		const speechEngine = this.getSpeechEngine();
		if (!speechEngine.isAvailable()) {
			debugLog('Speech request failed: no speech engine is available.');
			new Notice('Text-to-speech is not available in this environment.');
			return;
		}

		const requestId = ++this.speechRequestId;

		speechEngine.speak(
			text,
			{
				defaultLanguage: this.settings.defaultLanguage,
				voiceEngineId: voiceSelection.voiceEngineId,
				voiceId: voiceSelection.voiceId,
			},
			{
				onEnd: () => {
					if (!this.isCurrentRequest(requestId)) {
						return;
					}

					debugLog('Speech request completed.');
				},
				onError: () => {
					if (!this.isCurrentRequest(requestId)) {
						return;
					}

					new Notice('Unable to speak this text.');
				},
			},
		);
	}

	listVoices(): Promise<SpeechVoiceOption[]> {
		return this.getSpeechEngine().listVoices();
	}

	listEngines(): SpeechEngineOption[] {
		return getSupportedSpeechEngineOptions();
	}

	stop() {
		this.speechRequestId++;
		this.speechEngine.stop();
	}

	dispose() {
		this.speechRequestId++;
		this.speechEngine.dispose();
	}

	private isCurrentRequest(requestId: number): boolean {
		return this.speechRequestId === requestId;
	}

	private getSpeechEngine(): SpeechEngine {
		const engineId = resolveSpeechEngineId(this.settings.speechEngineId);
		if (this.speechEngine.id === engineId) {
			return this.speechEngine;
		}

		this.speechRequestId++;
		this.speechEngine.dispose();
		this.speechEngine = createSpeechEngine(engineId);
		return this.speechEngine;
	}
}
