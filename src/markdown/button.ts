import {
	MarkdownRenderChild,
	Notice,
	setIcon,
} from 'obsidian';
import { debugLog, getTextDebugInfo } from '../logger';
import { SpeechService, type SpeechRequest } from '../speech';

/**
 * Builds the icon-only button that triggers speech for one rendered tag.
 */
export function createSpeakOutButton(parentEl: HTMLElement): HTMLButtonElement {
	const buttonEl = parentEl.ownerDocument.createElement('button');
	buttonEl.type = 'button';
	buttonEl.classList.add('speak-out-button');
	buttonEl.setAttribute('aria-label', 'Speak this text');
	buttonEl.setAttribute('title', 'Speak this text');
	setIcon(buttonEl, 'volume-2');

	return buttonEl;
}

/**
 * Owns the lifecycle of one speak-out button inside Obsidian's rendered
 * markdown preview.
 */
export class SpeakOutButton extends MarkdownRenderChild {
	constructor(
		private readonly buttonEl: HTMLButtonElement,
		private readonly speechRequest: SpeechRequest,
		private readonly speechService: SpeechService,
	) {
		super(buttonEl);
	}

	onload() {
		debugLog('Speak-out button loaded.');

		this.registerDomEvent(this.buttonEl, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			const { text } = this.speechRequest;
			debugLog('Speak-out button clicked.', {
				...getTextDebugInfo(text),
				language: this.speechRequest.language,
			});

			if (!text) {
				debugLog('Speak-out click ignored because text is empty.');
				new Notice('No text to speak.');
				return;
			}

			this.speechService.speak(this.speechRequest);
		});
	}

	onunload() {
		debugLog('Speak-out button unloaded.');
	}
}
