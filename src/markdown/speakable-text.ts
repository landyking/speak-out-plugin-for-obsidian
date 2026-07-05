/**
 * Converts tagged markdown source into normalized plain text suitable for
 * speech and for matching against Obsidian's rendered preview text.
 */
export function getSpeakableSourceText(source: string): string {
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
