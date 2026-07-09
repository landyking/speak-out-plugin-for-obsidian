import {
	App,
	DropdownComponent,
	Notice,
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
const MARKER_SETTING_NOTICE = 'At least one Speak Out marker type must be enabled.';

const DEFAULT_LANGUAGE_OPTIONS: Record<string, string> = {
	'': 'System default',
	'en-US': 'English (US)',
	'en-GB': 'English (UK)',
	'zh-CN': 'Chinese (simplified)',
	'zh-TW': 'Chinese (traditional)',
	'zh-HK': 'Chinese (Hong Kong)',
	'ja-JP': 'Japanese',
	'ko-KR': 'Korean',
	'fr-FR': 'French',
	'de-DE': 'German',
	'es-ES': 'Spanish',
	'it-IT': 'Italian',
	'pt-BR': 'Portuguese (Brazil)',
	'ru-RU': 'Russian',
	'ar-SA': 'Arabic',
	'hi-IN': 'Hindi',
};

interface SpeakOutSettingDefinition {
	name: string;
	desc: string;
	render: (setting: Setting) => void;
}

interface UpdatableSettingTab {
	update?: () => void;
}

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

	getSettingDefinitions(): SpeakOutSettingDefinition[] {
		const speechEngineId = this.getSelectedSpeechEngineId();
		const speechEngines = this.speechService.listEngines();

		return [
			{
				name: 'Markdown link markers',
				desc: 'Add speaker buttons to marker-only links like [text](speak:) or [text](speak:fr-FR). The link behavior is removed in reading view.',
				render: (setting) => this.renderLinkMarkersSetting(setting),
			},
			{
				name: 'HTML data attribute markers',
				desc: 'Add speaker buttons to HTML elements marked with data-speak-out or data-speak. This keeps the original tag you choose in your note.',
				render: (setting) => this.renderDataAttributeMarkersSetting(setting),
			},
			{
				name: 'Speech engine',
				desc: 'Choose the text-to-speech engine. Only engines supported on this device are shown.',
				render: (setting) => {
					this.renderSpeechEngineSetting(
						setting,
						speechEngineId,
						speechEngines,
					);
				},
			},
			{
				name: 'Voice',
				desc: 'Select a voice for the selected engine.',
				render: (setting) => {
					this.renderVoiceSetting(setting, speechEngineId);
				},
			},
			{
				name: 'Default language',
				desc: 'Choose the language used when voice is set to system default.',
				render: (setting) => this.renderDefaultLanguageSetting(setting),
			},
		];
	}

	display() {
		this.renderSettings();
	}

	private renderSettings() {
		const { containerEl } = this;
		containerEl.empty();

		for (const definition of this.getSettingDefinitions()) {
			const setting = new Setting(containerEl)
				.setName(definition.name)
				.setDesc(definition.desc);
			definition.render(setting);
		}
	}

	private refreshSettings() {
		const settingTab = this as unknown as UpdatableSettingTab;

		if (typeof settingTab.update === 'function') {
			settingTab.update.call(this);
			return;
		}

		this.renderSettings();
	}

	private renderLinkMarkersSetting(setting: Setting) {
		setting.addToggle((toggle) => {
			toggle
				.setValue(this.settings.enableLinkMarkers)
				.onChange(async (value) => {
					if (!value && !this.settings.enableDataAttributeMarkers) {
						new Notice(MARKER_SETTING_NOTICE);
						this.refreshSettings();
						return;
					}

					this.settings.enableLinkMarkers = value;
					await this.saveSettings();
				});
		});
	}

	private renderDataAttributeMarkersSetting(setting: Setting) {
		setting.addToggle((toggle) => {
			toggle
				.setValue(this.settings.enableDataAttributeMarkers)
				.onChange(async (value) => {
					if (!value && !this.settings.enableLinkMarkers) {
						new Notice(MARKER_SETTING_NOTICE);
						this.refreshSettings();
						return;
					}

					this.settings.enableDataAttributeMarkers = value;
					await this.saveSettings();
				});
		});
	}

	private renderSpeechEngineSetting(
		setting: Setting,
		speechEngineId: string,
		speechEngines: ReturnType<SpeechService['listEngines']>,
	) {
		setting.addDropdown((dropdown) => {
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
				this.refreshSettings();
			});
		});
	}

	private renderDefaultLanguageSetting(setting: Setting) {
		setting.addDropdown((dropdown) => {
			for (const [value, label] of Object.entries(DEFAULT_LANGUAGE_OPTIONS)) {
				dropdown.addOption(value, label);
			}

			if (!(this.settings.defaultLanguage in DEFAULT_LANGUAGE_OPTIONS)) {
				dropdown.addOption(
					this.settings.defaultLanguage,
					`Custom (${this.settings.defaultLanguage})`,
				);
			}

			dropdown
				.setValue(this.settings.defaultLanguage)
				.onChange(async (value) => {
					this.settings.defaultLanguage = value;
					await this.saveSettings();
				});
		});
	}

	private renderVoiceSetting(setting: Setting, speechEngineId: string) {
		setting.settingEl.addClass('speak-out-setting-voice');
		setting
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
						this.refreshSettings();
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
