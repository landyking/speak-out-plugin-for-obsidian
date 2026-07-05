import { Plugin } from 'obsidian';
import { registerSpeakOutPostProcessor } from './markdown';
import { SpeechService } from './speech';

export default class SpeakOutPlugin extends Plugin {
	private speechService!: SpeechService;

	onload() {
		this.speechService = new SpeechService();
		registerSpeakOutPostProcessor(this, this.speechService);
	}

	onunload() {
		this.speechService.stop();
	}
}
