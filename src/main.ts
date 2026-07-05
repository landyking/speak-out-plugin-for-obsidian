import { Plugin } from 'obsidian';
import { debugLog } from './logger';
import { registerSpeakOutPostProcessor } from './markdown';
import { SpeechService } from './speech';

export default class SpeakOutPlugin extends Plugin {
	private speechService!: SpeechService;

	onload() {
		debugLog('Loading plugin.');
		this.speechService = new SpeechService();
		registerSpeakOutPostProcessor(this, this.speechService);
		debugLog('Plugin loaded.');
	}

	onunload() {
		debugLog('Unloading plugin.');
		this.speechService.stop();
		debugLog('Plugin unloaded.');
	}
}
