import { Notice } from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';

export class SpeechService {
	private currentUtterance: SpeechSynthesisUtterance | null = null;

	speak(text: string) {
		debugLog('Speech requested.', getTextDebugInfo(text));

		if (!this.isSpeechSynthesisAvailable()) {
			debugLog('Speech request failed: speech synthesis is unavailable.');
			new Notice('Text-to-speech is not available in this environment.');
			return;
		}

		this.stop();

		const utterance = new SpeechSynthesisUtterance(text);
		this.currentUtterance = utterance;

		debugLog('Speech utterance created.', {
			...getTextDebugInfo(text),
			lang: utterance.lang,
			pitch: utterance.pitch,
			rate: utterance.rate,
			voice: utterance.voice?.name ?? null,
			voicesAvailable: window.speechSynthesis.getVoices().length,
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
		};

		utterance.onerror = (event) => {
			debugLog('Speech error.', {
				...getSpeechEventDebugInfo(event),
				error: event.error,
			});
			if (this.currentUtterance === utterance) {
				this.currentUtterance = null;
			}
			new Notice('Unable to speak this text.');
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
		if (!this.isSpeechSynthesisAvailable()) {
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

	private isSpeechSynthesisAvailable(): boolean {
		return (
			'speechSynthesis' in window &&
			typeof SpeechSynthesisUtterance !== 'undefined'
		);
	}
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
