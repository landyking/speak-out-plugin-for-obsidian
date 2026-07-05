import { Plugin } from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';
import { SpeakOutButton, createSpeakOutButton } from './markdown/button';
import { insertButtonAfterSourceText } from './markdown/rendered-range';
import {
	SPEAK_OUT_TAG,
	getSourceSpeakOutMatches,
} from './markdown/source-tags';
import { getSpeakableSourceText } from './markdown/speakable-text';
import { SpeechService } from './speech';

/**
 * Registers the markdown post processor that finds <speak-out> source blocks,
 * locates their rendered text, and attaches a speak button to each match.
 */
export function registerSpeakOutPostProcessor(
	plugin: Plugin,
	speechService: SpeechService,
) {
	debugLog('Registering markdown post processor.', {
		tag: SPEAK_OUT_TAG,
	});

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		// Obsidian gives the rendered DOM here, so use section source text to find
		// custom tags that have already been stripped from the preview DOM.
		const sectionInfo = ctx.getSectionInfo(el);
		const sourceMatches =
			sectionInfo === null ? [] : getSourceSpeakOutMatches(sectionInfo.text);

			debugLog('Markdown post processor ran.', {
				docId: ctx.docId,
				sourceMatches: sourceMatches.length,
				hasSectionInfo: sectionInfo !== null,
				rootTagName: el.tagName,
		});

		let sourceSearchStart = 0;

		for (const sourceMatch of sourceMatches) {
			// Convert the tagged source to plain speakable text before matching it
			// against the rendered text nodes.
			const text = getSpeakableSourceText(sourceMatch.content);

			debugLog('Processing source speak-out match.', {
				docId: ctx.docId,
				...getTextDebugInfo(text),
			});

			const buttonEl = createSpeakOutButton(el);
			const insertion = insertButtonAfterSourceText(
				el,
				buttonEl,
				text,
				sourceSearchStart,
			);
			// Continue searching after this match so repeated text snippets map to
			// the correct later occurrence in the rendered section.
			sourceSearchStart = insertion.nextSearchStart;
			ctx.addChild(
				new SpeakOutButton(buttonEl, text, speechService),
			);

			debugLog('Inserted source speak-out button.', {
				docId: ctx.docId,
				insertedInline: insertion.insertedInline,
			});
		}
	});
}
