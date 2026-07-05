const SPEAK_OUT_CONTENT_CLASS = 'speak-out-content';
const SPEAK_OUT_CONTENT_TITLE = 'Speak Out content';

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
 * Places the speak button after the matching rendered text.
 */
export function insertButtonAfterSourceText(
	rootEl: HTMLElement,
	buttonEl: HTMLButtonElement,
	text: string,
	searchStart: number,
): { insertedInline: boolean; nextSearchStart: number } {
	const range = findRenderedTextRange(rootEl, text, searchStart);

	if (range === null) {
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

function findRenderedTextRange(
	rootEl: HTMLElement,
	text: string,
	searchStart: number,
): TextRange | null {
	if (!text) {
		return null;
	}

	const textPositions = getTextPositions(rootEl);
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

function getTextPositions(rootEl: HTMLElement): TextPosition[] {
	const textPositions: TextPosition[] = [];
	const walker = rootEl.ownerDocument.createTreeWalker(
		rootEl,
		NodeFilter.SHOW_TEXT,
		{
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

function markSpeakOutContentElement(el: HTMLElement) {
	el.classList.add(SPEAK_OUT_CONTENT_CLASS);

	if (!el.hasAttribute('title')) {
		el.setAttribute('title', SPEAK_OUT_CONTENT_TITLE);
	}
}
