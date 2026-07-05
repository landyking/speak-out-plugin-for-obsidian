import { Notice } from 'obsidian';

export class SpeechService {
	private currentUtterance: SpeechSynthesisUtterance | null = null;

	speak(text: string) {
		if (!this.isSpeechSynthesisAvailable()) {
			new Notice('Text-to-speech is not available in this environment.');
			return;
		}

		this.stop();

		const utterance = new SpeechSynthesisUtterance(text);
		this.currentUtterance = utterance;

		utterance.onend = () => {
			if (this.currentUtterance === utterance) {
				this.currentUtterance = null;
			}
		};

		utterance.onerror = () => {
			if (this.currentUtterance === utterance) {
				this.currentUtterance = null;
			}
			new Notice('Unable to speak this text.');
		};

		window.speechSynthesis.speak(utterance);
	}

	stop() {
		if (!this.isSpeechSynthesisAvailable()) {
			return;
		}

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
