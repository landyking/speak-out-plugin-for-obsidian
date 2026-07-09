import { debugLog, getTextDebugInfo } from '../logger';
import {
	SpeechEngine,
	type SpeechEngineCallbacks,
	type SpeechEngineSpeakOptions,
	type SpeechVoiceOption,
} from './types';

export const BROWSER_ENGINE_ID = 'browser';

export class BrowserSpeechEngine extends SpeechEngine {
	readonly id: string = BROWSER_ENGINE_ID;
	readonly label: string = 'Browser';

	private currentUtterance: SpeechSynthesisUtterance | null = null;
	private voiceWaitCleanup: (() => void) | null = null;
	protected voices: SpeechSynthesisVoice[] = [];

	private readonly handleVoicesChanged = () => {
		this.cacheVoices();
	};

	constructor() {
		super();

		if (this.isAvailable()) {
			this.cacheVoices();
			window.speechSynthesis.addEventListener(
				'voiceschanged',
				this.handleVoicesChanged,
			);
		}
	}

	dispose() {
		this.stop();
		this.clearVoiceWait();

		if (this.isAvailable()) {
			window.speechSynthesis.removeEventListener(
				'voiceschanged',
				this.handleVoicesChanged,
			);
		}
	}

	isAvailable(): boolean {
		return isBrowserSpeechAvailable();
	}

	async listVoices(): Promise<SpeechVoiceOption[]> {
		await this.waitForVoices();
		return this.voices.map((voice) => {
			return {
				description: getBrowserVoiceDescription(voice),
				engineId: this.id,
				engineLabel: this.label,
				id: getBrowserVoiceId(voice),
				lang: voice.lang,
				name: voice.name,
			};
		});
	}

	speak(
		text: string,
		options: SpeechEngineSpeakOptions,
		callbacks: SpeechEngineCallbacks,
	) {
		if (!this.isAvailable()) {
			debugLog('Speech request failed: speech synthesis is unavailable.');
			callbacks.onError();
			return;
		}

		this.stop();

		const utterance = new SpeechSynthesisUtterance(text);
		const voice = this.getSelectedVoice(options);
		if (voice !== null) {
			utterance.voice = voice;
			utterance.lang = voice.lang;
		} else if (!options.voiceId && options.defaultLanguage) {
			utterance.lang = options.defaultLanguage;
		}

		this.currentUtterance = utterance;

		debugLog('Speech utterance created.', {
			...getTextDebugInfo(text),
			lang: utterance.lang,
			pitch: utterance.pitch,
			rate: utterance.rate,
			voice: utterance.voice?.name ?? null,
			voiceEngine: this.id,
			voiceIsLocalService: utterance.voice?.localService ?? null,
			voicesAvailable: this.voices.length,
			volume: utterance.volume,
		});

		utterance.onstart = (event) => {
			debugLog('Speech started.', getSpeechEventDebugInfo(event));
		};

		utterance.onend = () => {
			debugLog('Speech ended.');
			if (this.currentUtterance === utterance) {
				this.currentUtterance = null;
			}
			callbacks.onEnd();
		};

		utterance.onerror = (event) => {
			debugLog('Speech error.', {
				...getSpeechEventDebugInfo(event),
				error: event.error,
			});
			if (this.currentUtterance === utterance) {
				this.currentUtterance = null;
			}
			callbacks.onError();
		};

		utterance.onpause = (event) => {
			debugLog('Speech paused.', getSpeechEventDebugInfo(event));
		};

		utterance.onresume = (event) => {
			debugLog('Speech resumed.', getSpeechEventDebugInfo(event));
		};

		debugLog('Submitting utterance to speech synthesis.', {
			pending: window.speechSynthesis.pending,
			paused: window.speechSynthesis.paused,
			speaking: window.speechSynthesis.speaking,
		});
		window.speechSynthesis.speak(utterance);
	}

	stop() {
		if (!this.isAvailable()) {
			debugLog('Stop ignored: speech synthesis is unavailable.');
			return;
		}

		debugLog('Stopping speech synthesis.', {
			hadCurrentUtterance: this.currentUtterance !== null,
			pending: window.speechSynthesis.pending,
			paused: window.speechSynthesis.paused,
			speaking: window.speechSynthesis.speaking,
		});
		window.speechSynthesis.cancel();
		this.currentUtterance = null;
	}

	private getSelectedVoice(
		options: SpeechEngineSpeakOptions,
	): SpeechSynthesisVoice | null {
		if (options.voiceEngineId !== this.id || !options.voiceId) {
			return null;
		}

		return (
			this.voices.find((voice) => getBrowserVoiceId(voice) === options.voiceId) ??
			null
		);
	}

	private cacheVoices() {
		this.voices = window.speechSynthesis.getVoices();
		debugLog('Browser speech voices cached.', {
			engine: this.id,
			voicesAvailable: this.voices.length,
		});
	}

	private waitForVoices(): Promise<void> {
		this.cacheVoices();
		if (this.voices.length > 0) {
			return Promise.resolve();
		}

		this.clearVoiceWait();

		return new Promise((resolve) => {
			let resolved = false;
			const handleVoicesChanged = () => finish();
			const timeoutId = window.setTimeout(() => finish(), 750);
			const cleanup = () => {
				window.clearTimeout(timeoutId);
				window.speechSynthesis.removeEventListener(
					'voiceschanged',
					handleVoicesChanged,
				);

				if (this.voiceWaitCleanup === cleanup) {
					this.voiceWaitCleanup = null;
				}
			};
			const finish = () => {
				if (resolved) {
					return;
				}

				resolved = true;
				cleanup();
				this.cacheVoices();
				resolve();
			};

			this.voiceWaitCleanup = cleanup;
			window.speechSynthesis.addEventListener(
				'voiceschanged',
				handleVoicesChanged,
			);
		});
	}

	private clearVoiceWait() {
		this.voiceWaitCleanup?.();
		this.voiceWaitCleanup = null;
	}
}

export function isBrowserSpeechAvailable(): boolean {
	return (
		'speechSynthesis' in window &&
		typeof SpeechSynthesisUtterance !== 'undefined'
	);
}

function getBrowserVoiceId(voice: SpeechSynthesisVoice): string {
	return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

function getBrowserVoiceDescription(voice: SpeechSynthesisVoice): string {
	const parts = [voice.lang];
	if (voice.localService) {
		parts.push('local');
	}
	if (voice.default) {
		parts.push('default');
	}

	return parts.filter(Boolean).join(', ');
}

function getSpeechEventDebugInfo(
	event: SpeechSynthesisEvent,
): Record<string, unknown> {
	return {
		charIndex: event.charIndex,
		elapsedTime: event.elapsedTime,
		name: event.name,
	};
}
