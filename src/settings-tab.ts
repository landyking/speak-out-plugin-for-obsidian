import {
	App,
	DropdownComponent,
	Plugin,
	PluginSettingTab,
	Setting,
} from 'obsidian';
import { SpeechService } from './speech';
import {
	getVoiceOptionValue,
	getVoiceSelectionValue,
	parseVoiceSelectionValue,
	type SpeakOutSettings,
} from './settings';

const VOICE_PREVIEW_TEXT = 'This is a preview of the selected voice.';

export class SpeakOutSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly settings: SpeakOutSettings,
		private readonly speechService: SpeechService,
		private readonly saveSettings: () => Promise<void>,
	) {
		super(app, plugin);
	}

	getSettingDefinitions() {
		return [];
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		const speechEngineId = this.getSelectedSpeechEngineId();
		const speechEngines = this.speechService.listEngines();

		new Setting(containerEl)
			.setName('Speech engine')
			.setDesc('Choose the text-to-speech engine. Only engines supported on this device are shown.')
			.addDropdown((dropdown) => {
				if (speechEngines.length === 0) {
					dropdown.addOption('', 'No supported engines');
					dropdown.selectEl.disabled = true;
					return;
				}

				for (const engine of speechEngines) {
					dropdown.addOption(engine.id, engine.label);
				}

				dropdown.setValue(speechEngineId);
				dropdown.onChange(async (value) => {
					this.settings.speechEngineId = value;
					this.settings.voiceEngineId = '';
					this.settings.voiceId = '';
					await this.saveSettings();
					this.display();
				});
			});

		const voiceSetting = new Setting(containerEl);
		voiceSetting.settingEl.addClass('speak-out-setting-voice');
		voiceSetting
			.setName('Voice')
			.setDesc('Select a voice for the selected engine.')
			.addDropdown((dropdown) => {
				this.renderVoiceDropdown(dropdown, speechEngineId);
			})
			.addButton((button) => {
				button.setButtonText('Listen').onClick(() => {
					this.previewSelectedVoice();
				});
			})
			.addButton((button) => {
				button
					.setButtonText('Refresh')
					.onClick(() => {
						this.display();
					});
			});
	}

	private renderVoiceDropdown(dropdown: DropdownComponent, speechEngineId: string) {
		if (!speechEngineId) {
			dropdown.addOption('', 'No supported engines');
			dropdown.selectEl.disabled = true;
			return;
		}

		dropdown.addOption('', 'System default');
		dropdown.addOption('__loading__', 'Loading voices...');
		dropdown.selectEl.disabled = true;
		dropdown.setValue('__loading__');

		void this.loadVoiceOptions(dropdown, speechEngineId);
	}

	private async loadVoiceOptions(
		dropdown: DropdownComponent,
		speechEngineId: string,
	) {
		const selectedValue =
			this.settings.voiceEngineId === speechEngineId
				? getVoiceSelectionValue(this.settings)
				: '';
		const voices = await this.speechService.listVoices();

		dropdown.selectEl.empty();
		dropdown.addOption('', 'System default');

		for (const voice of voices) {
			const label = formatVoiceLabel(
				voice.name,
				voice.lang,
				voice.engineLabel,
				voice.description,
			);
			dropdown.addOption(getVoiceOptionValue(voice.engineId, voice.id), label);
		}

		if (
			selectedValue &&
			!voices.some((voice) => {
				return getVoiceOptionValue(voice.engineId, voice.id) === selectedValue;
			})
		) {
			dropdown.addOption(selectedValue, 'Unavailable selected voice');
		}

		dropdown.setValue(selectedValue);
		dropdown.selectEl.disabled = false;
		dropdown.onChange(async (value) => {
			const selection = parseVoiceSelectionValue(value);
			this.settings.voiceEngineId = selection.voiceEngineId;
			this.settings.voiceId = selection.voiceId;
			await this.saveSettings();
		});
	}

	private previewSelectedVoice() {
		const selectedVoice = {
			voiceEngineId: this.settings.voiceEngineId,
			voiceId: this.settings.voiceId,
		};

		this.speechService.previewVoice(VOICE_PREVIEW_TEXT, selectedVoice);
	}

	private getSelectedSpeechEngineId(): string {
		const speechEngines = this.speechService.listEngines();
		const selectedEngine = speechEngines.find((engine) => {
			return engine.id === this.settings.speechEngineId;
		});

		return selectedEngine?.id ?? speechEngines[0]?.id ?? '';
	}
}

function formatVoiceLabel(
	name: string,
	lang: string,
	engineLabel: string,
	description: string,
): string {
	const details = [lang, engineLabel, description]
		.map((detail) => detail.trim())
		.filter(Boolean);

	if (details.length === 0) {
		return name;
	}

	return `${name} (${details.join(', ')})`;
}
