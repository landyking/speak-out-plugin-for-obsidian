# Speak Out

Speak Out lets you mark specific Markdown source content for text-to-speech and adds playback controls in Obsidian reading view.

## What it does

- Marks selected Markdown source text with the `data-speak-out` or `data-speak` attribute.
- Also supports marker-only links that point to `speak:` or `speak-out:`.
- Renders the tagged content normally in reading view.
- Adds a speaker control next to each tagged section.
- Uses the text-to-speech support available in Obsidian's browser environment.
- Provides plugin settings for speech engine and voice selection.

## Usage

In source view, add `data-speak-out` to any preserved HTML tag:

```html
<span data-speak-out>This sentence can be spoken from reading view.</span>
```

You can choose the tag that best fits the content. The shorter `data-speak` attribute works as an alias:

```html
<mark data-speak>This highlighted sentence can also be spoken.</mark>
```

You can also use marker-only Markdown links:

```markdown
[This sentence can be spoken from reading view.](speak:)
[This sentence can also be spoken.](speak-out:)
```

In reading view, the plugin renders the marked content normally and adds a speaker icon immediately after it. Marker-only links have their link behavior removed when the speaker icon is added. Select the icon to speak the tagged source content with the browser-provided text-to-speech engine.

## Settings

Speak Out adds a settings tab with:

- **Markdown link markers**: Enable marker-only links such as `[text](speak:)` and `[text](speak-out:)`.
- **HTML data attribute markers**: Enable HTML elements marked with `data-speak-out` or `data-speak`.
- **Speech engine**: Choose from the text-to-speech engines supported on the current device.
- **Voice**: Choose a voice for the selected engine, or use the system default.
- **Listen**: Preview the selected voice.
- **Refresh**: Reload the available voice list.

At least one marker type must stay enabled.

Available engines and voices depend on the device, operating system, and Obsidian runtime.

## Markup

The plugin uses data attributes so the tag name remains your choice. For inline text, use a neutral tag such as `<span>`. For highlighted text, use `<mark>`. For block content, use a block tag such as `<div>`.

Marker-only Markdown links are available for quick inline markup. The link destination is only a Speak Out marker and is removed in reading view.

## Privacy

Speak Out uses the Web Speech API exposed by Obsidian's browser environment. The plugin itself does not make network requests or send note content to a service.

Speech handling is delegated to the selected platform or browser text-to-speech engine. How that engine processes speech may vary by operating system, browser environment, installed voices, and device settings.

## Limitations

- Speak Out adds controls in reading view.
- Text-to-speech availability depends on Obsidian's browser environment.
- Voice availability varies by device and platform.
- Mobile behavior may vary depending on platform text-to-speech support.

## Development

Install dependencies:

```bash
npm install
```

Start a development build in watch mode:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Obsidian loads the bundled `main.js` at the plugin root. Source code lives in `src/`.

## License

BSD-3-Clause
