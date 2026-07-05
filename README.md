# Speak Out

Speak Out lets you mark specific Markdown source content for text-to-speech and adds playback controls in Obsidian reading view.

## Usage

In source view, wrap text with the canonical speak-out tag:

```html
<speak-out>This sentence can be spoken from reading view.</speak-out>
```

In reading view, the plugin renders the wrapped content normally and adds a speaker icon immediately after it. Select the icon to speak the tagged source content with the browser-provided text-to-speech engine.

## Tag naming

The plugin uses `<speak-out>` because lowercase, hyphenated names follow HTML custom element naming conventions and remain easy to read in Markdown source.

## Privacy

Speak Out uses the Web Speech API exposed by Obsidian's browser environment. The plugin does not make network requests or send note content to a service itself; speech handling is delegated to the platform/browser TTS engine.

## Development

Install dependencies:

```bash
npm install
```

Build the plugin:

```bash
npm run build
```
