const DATA_ATTRIBUTE_SELECTOR = '[data-speak-out], [data-speak]';
const LINK_MARKER_SELECTOR = [
	'a[href="speak:"]',
	'a[href="speak-out:"]',
	'a[data-href="speak:"]',
	'a[data-href="speak-out:"]',
].join(', ');
const LINK_MARKER_CLASSES = ['external-link', 'internal-link', 'is-unresolved'];
const LINK_MARKER_TARGETS = new Set(['speak:', 'speak-out:']);

export interface SpeakOutMarkerSettings {
	enableDataAttributeMarkers: boolean;
	enableLinkMarkers: boolean;
}

export abstract class SpeakOutMarker {
	abstract findMarkedElements(root: HTMLElement): HTMLElement[];
	abstract updateRenderedHtml(el: HTMLElement): void;
}

export class DataAttributeSpeakOutMarker extends SpeakOutMarker {
	findMarkedElements(root: HTMLElement): HTMLElement[] {
		return Array.from(root.querySelectorAll<HTMLElement>(DATA_ATTRIBUTE_SELECTOR));
	}

	updateRenderedHtml() {
		// Data attributes already render as inert marker metadata.
	}
}

export class LinkSpeakOutMarker extends SpeakOutMarker {
	findMarkedElements(root: HTMLElement): HTMLElement[] {
		return Array.from(root.querySelectorAll<HTMLElement>(LINK_MARKER_SELECTOR))
			.filter(isSpeakOutLinkMarker);
	}

	updateRenderedHtml(el: HTMLElement) {
		el.setAttribute('data-speak-out', '');
		el.removeAttribute('href');
		el.removeAttribute('data-href');
		el.removeAttribute('target');
		el.removeAttribute('rel');
		el.removeAttribute('tabindex');
		el.classList.remove(...LINK_MARKER_CLASSES);
	}
}

export function createEnabledSpeakOutMarkers(
	settings: SpeakOutMarkerSettings,
): SpeakOutMarker[] {
	const markers: SpeakOutMarker[] = [];

	if (settings.enableLinkMarkers) {
		markers.push(new LinkSpeakOutMarker());
	}

	if (settings.enableDataAttributeMarkers) {
		markers.push(new DataAttributeSpeakOutMarker());
	}

	return markers;
}

export function getSpeakOutMarkerSelectors(
	settings: SpeakOutMarkerSettings,
): string[] {
	const selectors: string[] = [];

	if (settings.enableLinkMarkers) {
		selectors.push(LINK_MARKER_SELECTOR);
	}

	if (settings.enableDataAttributeMarkers) {
		selectors.push(DATA_ATTRIBUTE_SELECTOR);
	}

	return selectors;
}

function isSpeakOutLinkMarker(el: HTMLElement) {
	return LINK_MARKER_TARGETS.has(el.getAttribute('href') ?? '')
		|| LINK_MARKER_TARGETS.has(el.getAttribute('data-href') ?? '');
}
