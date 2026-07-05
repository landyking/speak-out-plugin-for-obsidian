import {
	MarkdownRenderChild,
	Notice,
	Plugin,
	setIcon,
} from 'obsidian';
import { debugLog, getTextDebugInfo } from './logger';
import { SpeechService } from './speech';

export const SPEAK_OUT_TAG = 'speak-out';
const SPEAK_OUT_CONTENT_CLASS = 'speak-out-content';
const SPEAK_OUT_CONTENT_TITLE = 'Speak Out content';

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
			sourcePath: ctx.sourcePath,
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
				sourcePath: ctx.sourcePath,
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
				new SpeakOutButton(buttonEl, text, speechService, ctx.sourcePath),
			);

			debugLog('Inserted source speak-out button.', {
				docId: ctx.docId,
				sourcePath: ctx.sourcePath,
				insertedInline: insertion.insertedInline,
			});
		}
	});
}

interface SourceSpeakOutMatch {
	content: string;
}

interface TextPosition {
	node: Text;
	offset: number;
}

interface TextRange {
	start: TextPosition;
	end: TextPosition;
	nextSearchStart: number;
}

/**
 * Extracts the inner source content from every <speak-out>...</speak-out> tag.
 */
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

/**
 * Builds the icon-only button that triggers speech for one rendered tag.
 */
function createSpeakOutButton(parentEl: HTMLElement): HTMLButtonElement {
	const buttonEl = parentEl.ownerDocument.createElement('button');
	buttonEl.type = 'button';
	buttonEl.classList.add('speak-out-button');
	buttonEl.setAttribute('aria-label', 'Speak this text');
	buttonEl.setAttribute('title', 'Speak this text');
	setIcon(buttonEl, 'volume-2');

	return buttonEl;
}

/**
 * Places the speak button after the matching rendered text, falling back to the
 * section root when the source text cannot be found in the rendered DOM.
 */
function insertButtonAfterSourceText(
	rootEl: HTMLElement,
	buttonEl: HTMLButtonElement,
	text: string,
	searchStart: number,
): { insertedInline: boolean; nextSearchStart: number } {
	const range = findRenderedTextRange(rootEl, text, searchStart);

	if (range === null) {
		rootEl.appendChild(buttonEl);
		return {
			insertedInline: false,
			nextSearchStart: searchStart,
		};
	}

	// Wrap matched text segments first so styling can highlight the content and
	// the button can be inserted after the final wrapped segment.
	const contentEls = markRenderedTextRange(rootEl, range);
	const lastContentEl = contentEls[contentEls.length - 1];

	if (lastContentEl === undefined) {
		insertElementAtTextPosition(buttonEl, range.end);
	} else {
		lastContentEl.insertAdjacentElement('afterend', buttonEl);
	}

	return {
		insertedInline: true,
		nextSearchStart: range.nextSearchStart,
	};
}

/**
 * Finds the start and end text-node positions for a source string within the
 * concatenated rendered text of a markdown section.
 */
function findRenderedTextRange(
	rootEl: HTMLElement,
	text: string,
	searchStart: number,
): TextRange | null {
	if (!text) {
		return null;
	}

	const textPositions = getTextPositions(rootEl);
	// Flatten text nodes into a single search string while keeping the original
	// node order so indices can be converted back into DOM positions.
	const renderedText = textPositions.map((position) => position.node.data).join('');
	const startIndex = renderedText.indexOf(text, searchStart);

	if (startIndex === -1) {
		return null;
	}

	const endIndex = startIndex + text.length;
	const start = getTextPositionAtIndex(textPositions, startIndex);
	const end = getTextPositionAtIndex(textPositions, endIndex);

	if (start === null || end === null) {
		return null;
	}

	return {
		start,
		end,
		nextSearchStart: endIndex,
	};
}

/**
 * Applies the shared speak-out content styling and accessibility title.
 */
function markSpeakOutContentElement(el: HTMLElement) {
	el.classList.add(SPEAK_OUT_CONTENT_CLASS);

	if (!el.hasAttribute('title')) {
		el.setAttribute('title', SPEAK_OUT_CONTENT_TITLE);
	}
}

/**
 * Wraps every text-node segment covered by the range and returns the created
 * content spans in document order.
 */
function markRenderedTextRange(
	rootEl: HTMLElement,
	range: TextRange,
): HTMLElement[] {
	const textPositions = getTextPositions(rootEl);
	const contentEls: HTMLElement[] = [];
	let inRange = false;

	for (const position of textPositions) {
		if (position.node === range.start.node) {
			inRange = true;
		}

		if (inRange) {
			// Clamp offsets to the current node: only the first and last nodes may
			// use partial ranges, while middle nodes are wrapped completely.
			const startOffset =
				position.node === range.start.node ? range.start.offset : 0;
			const endOffset =
				position.node === range.end.node
					? range.end.offset
					: position.node.data.length;
			const contentEl = wrapTextSegment(position.node, startOffset, endOffset);

			if (contentEl !== null) {
				contentEls.push(contentEl);
			}
		}

		if (position.node === range.end.node) {
			break;
		}
	}

	return contentEls;
}

/**
 * Splits a text node around the requested segment and wraps that segment in a
 * span that marks it as speak-out content.
 */
function wrapTextSegment(
	node: Text,
	startOffset: number,
	endOffset: number,
): HTMLElement | null {
	if (startOffset >= endOffset) {
		return null;
	}

	const parentEl = node.parentElement;

	if (parentEl === null) {
		return null;
	}

	let selectedNode = node;

	// Split from the end first so the start offset still refers to the original
	// node coordinates after the trailing text is detached.
	if (endOffset < selectedNode.data.length) {
		selectedNode.splitText(endOffset);
	}

	if (startOffset > 0) {
		selectedNode = selectedNode.splitText(startOffset);
	}

	const contentEl = node.ownerDocument.createElement('span');
	markSpeakOutContentElement(contentEl);
	parentEl.insertBefore(contentEl, selectedNode);
	contentEl.appendChild(selectedNode);

	return contentEl;
}

/**
 * Collects visible text nodes under the rendered section, excluding text that
 * belongs to speak-out buttons inserted by this post processor.
 */
function getTextPositions(rootEl: HTMLElement): TextPosition[] {
	const textPositions: TextPosition[] = [];
	const walker = rootEl.ownerDocument.createTreeWalker(
		rootEl,
		NodeFilter.SHOW_TEXT,
		{
			/**
			 * Skips non-content nodes so button labels/icons do not affect text
			 * matching for later speak-out tags.
			 */
			acceptNode(node) {
				if (
					node.parentElement === null ||
					node.parentElement.closest('.speak-out-button') !== null
				) {
					return NodeFilter.FILTER_REJECT;
				}

				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);

	let node = walker.nextNode();
	while (node !== null) {
		if (node.instanceOf(Text)) {
			textPositions.push({
				node,
				offset: 0,
			});
		}
		node = walker.nextNode();
	}

	return textPositions;
}

/**
 * Converts a character index in concatenated rendered text back to a concrete
 * text node and offset.
 */
function getTextPositionAtIndex(
	textPositions: TextPosition[],
	index: number,
): TextPosition | null {
	let currentIndex = 0;

	for (const position of textPositions) {
		const nextIndex = currentIndex + position.node.data.length;

		if (index <= nextIndex) {
			return {
				node: position.node,
				offset: index - currentIndex,
			};
		}

		currentIndex = nextIndex;
	}

	return null;
}

/**
 * Inserts an element at a text-node position, splitting the node when the
 * position falls in the middle of its text.
 */
function insertElementAtTextPosition(
	element: HTMLElement,
	position: TextPosition,
) {
	const parentEl = position.node.parentElement;

	if (parentEl === null) {
		return;
	}

	if (position.offset < position.node.data.length) {
		const remainder = position.node.splitText(position.offset);
		parentEl.insertBefore(element, remainder);
		return;
	}

	parentEl.insertBefore(element, position.node.nextSibling);
}

/**
 * Owns the lifecycle of one speak-out button inside Obsidian's rendered
 * markdown preview.
 */
class SpeakOutButton extends MarkdownRenderChild {
	/**
	 * Stores the rendered button, text to speak, speech service, and source path
	 * for lifecycle logging.
	 */
	constructor(
		private readonly buttonEl: HTMLButtonElement,
		private readonly text: string,
		private readonly speechService: SpeechService,
		private readonly sourcePath: string,
	) {
		super(buttonEl);
	}

	/**
	 * Registers the click handler that speaks the matched text and is cleaned up
	 * automatically when the markdown child unloads.
	 */
	onload() {
		debugLog('Speak-out button loaded.', {
			sourcePath: this.sourcePath,
		});

		this.registerDomEvent(this.buttonEl, 'click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			debugLog('Speak-out button clicked.', {
				sourcePath: this.sourcePath,
				...getTextDebugInfo(this.text),
			});

			if (!this.text) {
				debugLog('Speak-out click ignored because text is empty.', {
					sourcePath: this.sourcePath,
				});
				new Notice('No text to speak.');
				return;
			}

			this.speechService.speak(this.text);
		});
	}

	/**
	 * Logs button cleanup when Obsidian unloads or rerenders this markdown child.
	 */
	onunload() {
		debugLog('Speak-out button unloaded.', {
			sourcePath: this.sourcePath,
		});
	}
}

/**
 * Converts tagged markdown source into normalized plain text suitable for
 * speech and for matching against Obsidian's rendered preview text.
 */
function getSpeakableSourceText(source: string): string {
	const withoutHtml = source.replace(/<[^>]+>/g, ' ');
	const withoutMarkdown = withoutHtml
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
		.replace(/[`*_~>#-]+/g, ' ');

	return decodeHtmlEntities(withoutMarkdown).replace(/\s+/g, ' ').trim();
}

/**
 * Decodes the small set of named and numeric HTML entities expected in markdown
 * source without pulling in an additional dependency.
 */
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

/**
 * Safely converts a numeric entity code point, returning the original entity
 * text when the value is invalid.
 */
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
