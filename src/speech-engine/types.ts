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
	language: string;
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
