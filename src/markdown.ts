import {
	MarkdownRenderChild,
	Notice,
	Plugin,
	setIcon,
} from 'obsidian';
import { SpeechService } from './speech';

export const SPEAK_OUT_TAG = 'speak-out';

export function registerSpeakOutPostProcessor(
	plugin: Plugin,
	speechService: SpeechService,
) {
	plugin.registerMarkdownPostProcessor((el, ctx) => {
		const speakOutEls = getSpeakOutElements(el);

		for (const speakOutEl of speakOutEls) {
			if (speakOutEl.classList.contains('speak-out-content')) {
				continue;
			}

			speakOutEl.classList.add('speak-out-content');

			const buttonEl = activeDocument.createEl('button', {
				type: 'button',
			});
			buttonEl.classList.add('speak-out-button');
			buttonEl.setAttribute('aria-label', 'Speak this text');
			buttonEl.setAttribute('title', 'Speak this text');
			setIcon(buttonEl, 'volume-2');

			speakOutEl.insertAdjacentElement('afterend', buttonEl);
			ctx.addChild(
				new SpeakOutButton(buttonEl, speakOutEl, speechService),
			);
		}
	});
}

function getSpeakOutElements(el: HTMLElement): HTMLElement[] {
	const elements = Array.from(
		el.querySelectorAll<HTMLElement>(SPEAK_OUT_TAG),
	);

	if (el.matches(SPEAK_OUT_TAG)) {
		elements.unshift(el);
	}

	return elements;
}

class SpeakOutButton extends MarkdownRenderChild {
	constructor(
		private readonly buttonEl: HTMLButtonElement,
		private readonly speakOutEl: HTMLElement,
		private readonly speechService: SpeechService,
	) {
		super(buttonEl);
	}

	onload() {
		this.registerDomEvent(this.buttonEl, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			const text = getSpeakableText(this.speakOutEl);

			if (!text) {
				new Notice('No text to speak.');
				return;
			}

			this.speechService.speak(text);
		});
	}
}

function getSpeakableText(el: HTMLElement): string {
	return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}
