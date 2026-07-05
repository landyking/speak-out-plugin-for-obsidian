import { Plugin } from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';
import { SpeakOutButton, createSpeakOutButton } from './markdown/button';
import { SpeechService } from './speech';

const SPEAK_OUT_SELECTOR = '[data-speak-out], [data-speak]';
const SPEAK_OUT_CONTENT_CLASS = 'speak-out-content';
const SPEAK_OUT_CONTENT_TITLE = 'Speak Out content';

/**
 * Registers the markdown post processor that finds speak-out data attributes
 * in rendered markdown and attaches a speak button to each marked element.
 */
export function registerSpeakOutPostProcessor(
	plugin: Plugin,
	speechService: SpeechService,
) {
	debugLog('Registering markdown post processor.', {
		selector: SPEAK_OUT_SELECTOR,
	});

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		const markedEls = Array.from(
			el.querySelectorAll<HTMLElement>(SPEAK_OUT_SELECTOR),
		);

		debugLog('Markdown post processor ran.', {
			docId: ctx.docId,
			markedElements: markedEls.length,
			rootTagName: el.tagName,
		});

		for (const markedEl of markedEls) {
			const text = markedEl.textContent?.trim() ?? '';

			if (!text) {
				debugLog('Skipping empty speak-out marker.', {
					docId: ctx.docId,
					tagName: markedEl.tagName,
				});
				continue;
			}

			debugLog('Processing speak-out marker.', {
				docId: ctx.docId,
				tagName: markedEl.tagName,
				...getTextDebugInfo(text),
			});

			const buttonEl = createSpeakOutButton(el);

			markSpeakOutContentElement(markedEl);
			markedEl.insertAdjacentElement('afterend', buttonEl);
			ctx.addChild(new SpeakOutButton(buttonEl, text, speechService));

			debugLog('Inserted speak-out button.', {
				docId: ctx.docId,
				tagName: markedEl.tagName,
			});
		}
	});
}

function markSpeakOutContentElement(el: HTMLElement) {
	el.classList.add(SPEAK_OUT_CONTENT_CLASS);

	if (!el.hasAttribute('title')) {
		el.setAttribute('title', SPEAK_OUT_CONTENT_TITLE);
	}
}
