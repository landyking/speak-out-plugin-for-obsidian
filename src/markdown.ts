import { Plugin } from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';
import { SpeakOutButton, createSpeakOutButton } from './markdown/button';
import {
	createDefaultSpeakOutMarkers,
	getSpeakOutMarkerSelectors,
} from './markdown/markers';
import { SpeechService } from './speech';

const SPEAK_OUT_CONTENT_CLASS = 'speak-out-content';
const SPEAK_OUT_BUTTON_CLASS = 'speak-out-button';
const SPEAK_OUT_CONTENT_TITLE = 'Speak Out content';

/**
 * Registers the markdown post processor that finds speak-out markers in
 * rendered markdown and attaches a speak button to each marked element.
 */
export function registerSpeakOutPostProcessor(
	plugin: Plugin,
	speechService: SpeechService,
) {
	const markers = createDefaultSpeakOutMarkers();

	debugLog('Registering markdown post processor.', {
		selectors: getSpeakOutMarkerSelectors(),
	});

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		const processedEls = new Set<HTMLElement>();
		const markedEls = markers.flatMap((marker) => (
			marker.findMarkedElements(el).map((markedEl) => ({ marker, markedEl }))
		));

		debugLog('Markdown post processor ran.', {
			docId: ctx.docId,
			markedElements: markedEls.length,
			rootTagName: el.tagName,
		});

		for (const { marker, markedEl } of markedEls) {
			if (processedEls.has(markedEl)) {
				debugLog('Skipping duplicate speak-out marker.', {
					docId: ctx.docId,
					tagName: markedEl.tagName,
				});
				continue;
			}

			processedEls.add(markedEl);
			marker.updateRenderedHtml(markedEl);

			const text = markedEl.textContent?.trim() ?? '';

			if (!text) {
				debugLog('Skipping empty speak-out marker.', {
					docId: ctx.docId,
					tagName: markedEl.tagName,
				});
				continue;
			}

			if (hasAdjacentSpeakOutButton(markedEl)) {
				debugLog('Skipping speak-out marker with existing button.', {
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

function hasAdjacentSpeakOutButton(el: HTMLElement) {
	return el.nextElementSibling?.classList.contains(SPEAK_OUT_BUTTON_CLASS) ?? false;
}

function markSpeakOutContentElement(el: HTMLElement) {
	el.classList.add(SPEAK_OUT_CONTENT_CLASS);

	if (!el.hasAttribute('title')) {
		el.setAttribute('title', SPEAK_OUT_CONTENT_TITLE);
	}
}
