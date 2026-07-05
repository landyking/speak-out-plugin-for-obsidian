import { Plugin } from 'obsidian';
import { debugLog } from './logger';
import { registerSpeakOutPostProcessor } from './markdown';
import { DEFAULT_SETTINGS, type SpeakOutSettings } from './settings';
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SpeakOutSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
