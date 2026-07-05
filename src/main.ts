import { Plugin } from 'obsidian';
import { debugLog } from './logger';
import { registerSpeakOutPostProcessor } from './markdown';
import { normalizeSettings, type SpeakOutSettings } from './settings';
import { SpeakOutSettingTab } from './settings-tab';
import { SpeechService } from './speech';

export default class SpeakOutPlugin extends Plugin {
	settings!: SpeakOutSettings;
	private speechService!: SpeechService;

	async onload() {
		debugLog('Loading plugin.');
		await this.loadSettings();
		this.speechService = new SpeechService(this.settings);
		this.addSettingTab(
			new SpeakOutSettingTab(
				this.app,
				this,
				this.settings,
				this.speechService,
				() => this.saveSettings(),
			),
		);
		registerSpeakOutPostProcessor(this, this.speechService);
		debugLog('Plugin loaded.');
	}

	onunload() {
		debugLog('Unloading plugin.');
		this.speechService.dispose();
		debugLog('Plugin unloaded.');
	}

	private async loadSettings() {
		this.settings = normalizeSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
