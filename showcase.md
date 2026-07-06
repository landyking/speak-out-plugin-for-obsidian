# Speak Out demo

This note shows several ways to mark text for speech. Switch to reading view, then select the speaker buttons beside the marked passages.

## Quick examples

[This sentence uses a Markdown link marker.](speak:)

[This one uses the longer speak-out marker, which behaves the same in reading view.](speak-out:)

Here is an inline HTML marker: <span data-speak-out>This inline sentence can be spoken without changing the surrounding paragraph.</span>

Here is a highlighted marker: <mark data-speak>This highlighted passage is also speakable.</mark>

## Longer passage

<div data-speak-out>
Good writing sounds different when read aloud. Speak Out makes it easy to test rhythm, clarity, and pacing without leaving your note.
</div>

## Drafting checklist

- [Read this reminder aloud before revising.](speak:)
- Keep sentences direct.
- [Listen for repeated words, awkward pauses, and missing context.](speak-out:)
- Tighten anything that sounds harder than it needs to be.

## Presentation notes

### Opening

<span data-speak-out>Welcome everyone. Today I will walk through the problem, the approach, and the next decision we need to make.</span>

### Transition

[Now that the background is clear, let’s look at the tradeoffs in the current design.](speak:)

### Closing

<div data-speak-out>
The next step is to test this workflow with one real note, gather feedback, and decide whether the defaults are clear enough for everyday use.
</div>