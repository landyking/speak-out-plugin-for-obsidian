export const SPEAK_OUT_TAG = 'speak-out';

export interface SourceSpeakOutMatch {
	content: string;
}

/**
 * Extracts the inner source content from every <speak-out>...</speak-out> tag.
 */
export function getSourceSpeakOutMatches(source: string): SourceSpeakOutMatch[] {
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
