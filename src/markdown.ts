import {
	MarkdownRenderChild,
	Notice,
	Plugin,
	setIcon,
} from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';
import { SpeechService } from './speech';

export const SPEAK_OUT_TAG = 'speak-out';

export function registerSpeakOutPostProcessor(
	plugin: Plugin,
	speechService: SpeechService,
) {
	debugLog('Registering markdown post processor.', {
		tag: SPEAK_OUT_TAG,
	});

	plugin.registerMarkdownPostProcessor((el, ctx) => {
		const speakOutEls = getSpeakOutElements(el);
		const sectionInfo = ctx.getSectionInfo(el);
		const sourceMatches =
			speakOutEls.length === 0 && sectionInfo !== null
				? getSourceSpeakOutMatches(sectionInfo.text)
				: [];

		debugLog('Markdown post processor ran.', {
			docId: ctx.docId,
			sourcePath: ctx.sourcePath,
			matches: speakOutEls.length,
			sourceMatches: sourceMatches.length,
			hasSectionInfo: sectionInfo !== null,
			rootTagName: el.tagName,
		});

		for (const speakOutEl of speakOutEls) {
			if (speakOutEl.classList.contains('speak-out-content')) {
				debugLog('Skipping already processed speak-out element.', {
					docId: ctx.docId,
					sourcePath: ctx.sourcePath,
				});
				continue;
			}

			speakOutEl.classList.add('speak-out-content');
			const text = getSpeakableText(speakOutEl);

			debugLog('Processing speak-out element.', {
				docId: ctx.docId,
				sourcePath: ctx.sourcePath,
				...getTextDebugInfo(text),
			});

			const buttonEl = createSpeakOutButton(speakOutEl);
			speakOutEl.insertAdjacentElement('afterend', buttonEl);
			ctx.addChild(
				new SpeakOutButton(
					buttonEl,
					speakOutEl,
					speechService,
					ctx.sourcePath,
				),
			);

			debugLog('Inserted speak-out button.', {
				docId: ctx.docId,
				sourcePath: ctx.sourcePath,
			});
		}

		for (const sourceMatch of sourceMatches) {
			const text = getSpeakableSourceText(sourceMatch.content);

			debugLog('Processing source speak-out match.', {
				docId: ctx.docId,
				sourcePath: ctx.sourcePath,
				...getTextDebugInfo(text),
			});

			const buttonEl = createSpeakOutButton(el);
			el.appendChild(buttonEl);
			ctx.addChild(
				new SourceSpeakOutButton(buttonEl, text, speechService, ctx.sourcePath),
			);

			debugLog('Inserted source speak-out button.', {
				docId: ctx.docId,
				sourcePath: ctx.sourcePath,
			});
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

interface SourceSpeakOutMatch {
	content: string;
}

function getSourceSpeakOutMatches(source: string): SourceSpeakOutMatch[] {
	const matches: SourceSpeakOutMatch[] = [];
	const tagPattern = /<speak-out(?:\s[^>]*)?>([\s\S]*?)<\/speak-out>/gi;
	let match: RegExpExecArray | null;

	while ((match = tagPattern.exec(source)) !== null) {
		matches.push({
			content: match[1] ?? '',
		});
	}

	return matches;
}

function createSpeakOutButton(parentEl: HTMLElement): HTMLButtonElement {
	const buttonEl = parentEl.ownerDocument.createElement('button');
	buttonEl.type = 'button';
	buttonEl.classList.add('speak-out-button');
	buttonEl.setAttribute('aria-label', 'Speak this text');
	buttonEl.setAttribute('title', 'Speak this text');
	setIcon(buttonEl, 'volume-2');

	return buttonEl;
}

class SpeakOutButton extends MarkdownRenderChild {
	constructor(
		private readonly buttonEl: HTMLButtonElement,
		private readonly speakOutEl: HTMLElement,
		private readonly speechService: SpeechService,
		private readonly sourcePath: string,
	) {
		super(buttonEl);
	}

	onload() {
		debugLog('Speak-out button loaded.', {
			sourcePath: this.sourcePath,
		});

		this.registerDomEvent(this.buttonEl, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			const text = getSpeakableText(this.speakOutEl);

			debugLog('Speak-out button clicked.', {
				sourcePath: this.sourcePath,
				...getTextDebugInfo(text),
			});

			if (!text) {
				debugLog('Speak-out click ignored because text is empty.', {
					sourcePath: this.sourcePath,
				});
				new Notice('No text to speak.');
				return;
			}

			this.speechService.speak(text);
		});
	}

	onunload() {
		debugLog('Speak-out button unloaded.', {
			sourcePath: this.sourcePath,
		});
	}
}

function getSpeakableText(el: HTMLElement): string {
	return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

class SourceSpeakOutButton extends MarkdownRenderChild {
	constructor(
		private readonly buttonEl: HTMLButtonElement,
		private readonly text: string,
		private readonly speechService: SpeechService,
		private readonly sourcePath: string,
	) {
		super(buttonEl);
	}

	onload() {
		debugLog('Source speak-out button loaded.', {
			sourcePath: this.sourcePath,
		});

		this.registerDomEvent(this.buttonEl, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			debugLog('Source speak-out button clicked.', {
				sourcePath: this.sourcePath,
				...getTextDebugInfo(this.text),
			});

			if (!this.text) {
				debugLog('Source speak-out click ignored because text is empty.', {
					sourcePath: this.sourcePath,
				});
				new Notice('No text to speak.');
				return;
			}

			this.speechService.speak(this.text);
		});
	}

	onunload() {
		debugLog('Source speak-out button unloaded.', {
			sourcePath: this.sourcePath,
		});
	}
}

function getSpeakableSourceText(source: string): string {
	const withoutHtml = source.replace(/<[^>]+>/g, ' ');
	const withoutMarkdown = withoutHtml
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
		.replace(/[`*_~>#-]+/g, ' ');

	return decodeHtmlEntities(withoutMarkdown).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(text: string): string {
	return text.replace(
		/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
		(entity, value: string) => {
			const lowerValue = value.toLowerCase();

			if (lowerValue.startsWith('#x')) {
				return decodeCodePoint(Number.parseInt(lowerValue.slice(2), 16), entity);
			}

			if (lowerValue.startsWith('#')) {
				return decodeCodePoint(Number.parseInt(lowerValue.slice(1), 10), entity);
			}

			switch (lowerValue) {
				case 'amp':
					return '&';
				case 'lt':
					return '<';
				case 'gt':
					return '>';
				case 'quot':
					return '"';
				case 'apos':
					return "'";
				case 'nbsp':
					return ' ';
				default:
					return entity;
			}
		},
	);
}

function decodeCodePoint(codePoint: number, fallback: string): string {
	if (!Number.isFinite(codePoint)) {
		return fallback;
	}

	try {
		return String.fromCodePoint(codePoint);
	} catch {
		return fallback;
	}
}
