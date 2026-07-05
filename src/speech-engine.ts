import { debugLog, getTextDebugInfo } from './logger';

const BROWSER_ENGINE_ID = 'browser';

export interface SpeechEngineOption {
	id: string;
	label: string;
	description: string;
}

export interface SpeechEngineCallbacks {
	onEnd: () => void;
	onError: () => void;
}

export interface SpeechEngineSpeakOptions {
	voiceEngineId: string;
	voiceId: string;
}

export interface SpeechVoiceOption {
	description: string;
	engineId: string;
	engineLabel: string;
	id: string;
	lang: string;
	name: string;
}

export abstract class SpeechEngine {
	abstract readonly id: string;
	abstract readonly label: string;

	abstract dispose(): void;
	abstract isAvailable(): boolean;
	abstract listVoices(): Promise<SpeechVoiceOption[]>;
	abstract speak(
		text: string,
		options: SpeechEngineSpeakOptions,
		callbacks: SpeechEngineCallbacks,
	): void;
	abstract stop(): void;
}

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

class BrowserSpeechEngine extends SpeechEngine {
	readonly id: string = BROWSER_ENGINE_ID;
	readonly label: string = 'Browser';

	private currentUtterance: SpeechSynthesisUtterance | null = null;
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

		return new Promise((resolve) => {
			const timeoutId = window.setTimeout(() => {
				window.speechSynthesis.removeEventListener(
					'voiceschanged',
					handleVoicesChanged,
				);
				this.cacheVoices();
				resolve();
			}, 750);

			const handleVoicesChanged = () => {
				window.clearTimeout(timeoutId);
				window.speechSynthesis.removeEventListener(
					'voiceschanged',
					handleVoicesChanged,
				);
				this.cacheVoices();
				resolve();
			};

			window.speechSynthesis.addEventListener(
				'voiceschanged',
				handleVoicesChanged,
			);
		});
	}
}

function getBrowserVoiceId(voice: SpeechSynthesisVoice): string {
	return voice.voiceURI || `${voice.name}|${voice.lang}`;
}

function isBrowserSpeechAvailable(): boolean {
	return (
		'speechSynthesis' in window &&
		typeof SpeechSynthesisUtterance !== 'undefined'
	);
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
