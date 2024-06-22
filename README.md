![MarkupChisel](./logo.svg)
===========================

A minimal Markdown editor based on [CodeMirror 6](https://codemirror.net/6/).


## Contents

* [Features](#features)
* [Building from source](#building-from-source)
* [Usage](#usage)
* [CSS identifiers](#css-identifiers)
  * [CSS classes](#css-classes)
  * [CSS variables](#css-variables)
* [License](#license)


## Features

* No toolbars, line numbers, previews, or other chrome—just a text area
* Headings use appropriate font sizes
* Syntax highlighting for CodeMirror-supported languages
* Uses page font by default
  * Main font may be set via `--markupchisel-font-family`
  * Monospace font may be set via `--markupchisel-font-family-monospace`
* Stable CSS classes for token types (see [below](#css-classes) for a list)
* Supports [GitHub Flavored Markdown (GFM) extensions](https://github.github.com/gfm/)
* Extra features (can be disabled by using the `MarkupChiselBaseView` class):
  * Default color palette based on Adwaita with dark theme support per system preference or [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)
  * Spellcheck, autocorrect, and autocapitalizing sentences are enabled by default
  * Caret color follows syntax color
  * System selection colors
  * CSS variables for color names, scoped for use in CM6 themes (see [below](#css-variables) for a list)
  * Interactive features (disabled by default)
    * Clicking on a checkbox without holding a modifier key will toggle the
      state of the checkbox.  Double-clicking will toggle the capitalization
      of the `x` in the checkbox.
    * Double-clicking on a link without holding a modifier key will open the
      link in a new tab.  Double-clicking on the name of a link reference
      will scroll to and highlight the link reference's URL.


## Building from source

```sh
$ npm install
$ npm run build  # or make
```


## Usage

As a custom element:

```html
<markup-chisel>**Hello** _world_!</markup-chisel>
```

The following boolean attributes are available:

* `no-autocapitalize`: Disables auto-capitalization
* `no-autocorrect`: Disables autocorrect
* `no-spellcheck`: Disables spell check
* `interactive`: Enables interactive features

As an ECMAScript module:

```javascript
import * as MarkupChisel from "./dist/markupchisel.lite.bundle.esm.js";

window.markupChisel = new MarkupChisel.MarkupChiselView({
  doc: `**Hello** _world_!`,
  parent: document.body,
});
```

As a regular script:

```html
<script src="./dist/markupchisel.lite.bundle.iife.js"></script>
<script>
  window.markupChisel = new MarkupChisel.MarkupChiselView({
    doc: `**Hello** _world_!`,
    parent: document.body,
  });
</script>
```

The `lite` bundle used in these examples contains a subset of CodeMirror's
supported languages (for highlighting code blocks).  For a list of these
languages, see [src/lite-languages.json](./src/lite-languages.json).
A `full` variant is also available, which contains all supported languages,
as well as a `nano` variant, which contains support for no languages
other than Markdown.

When using the bundles, certain CodeMirror and Lezer Parser modules are
available via `MarkupChisel.imports`.  See [src/bundle.js](./src/bundle.js)
for details.

To enable the interactive features, set up MarkupChisel as follows:

```html
<markup-chisel interactive>**Hello** _world_!</markup-chisel>
```

or

```javascript
window.markupChisel = new MarkupChisel.MarkupChiselView({
  doc: `**Hello** _world_!`,
  parent: document.body,
}, {
  interactive: true,
});
```

or to choose which interactive features are enabled:

```javascript
window.markupChisel = new MarkupChisel.MarkupChiselView({
  doc: `**Hello** _world_!`,
  parent: document.body,
}, {
  interactive: {
    checkboxes: true,
    links: true,
  },
});
```


## CSS identifiers

### CSS classes

* See [documentation for `@lezer/highlight#classHighlighter`](https://lezer.codemirror.net/docs/ref/#highlight.classHighlighter) for a list
* These classes are also provided along with appropriate default CSS:
  * `.tok-markup`, to style only supported markup languages
  * `.tok-markdown`, to style only Markdown code
  * `.tok-heading1` through `.tok-heading6`
  * `.tok-autolink`
  * `.tok-checkbox`
  * `.tok-code` (for semantic purposes only; do not use to apply monospace fonts)
  * `.tok-codeBlock` (for semantic purposes only; do not use to apply monospace fonts)
  * `.tok-codeIndented` (for semantic purposes only; do not use to apply monospace fonts)
  * `.tok-codeInfo`
  * `.tok-codeInline` (for semantic purposes only; do not use to apply monospace fonts)
  * `.tok-contentSeparator`
  * `.tok-emoji`
  * `.tok-entity`
  * `.tok-escape`
  * `.tok-headingPrefixed`
  * `.tok-headingUnderlined`
  * `.tok-image`
  * `.tok-linkImage`
  * `.tok-linkLabel`
  * `.tok-linkReference`
  * `.tok-linkTitle`
  * `.tok-linkURL`
  * `.tok-nested`
  * `.tok-punctuation` (for Markdown delimiters)
  * `.tok-strikethrough`
  * `.tok-subscript`
  * `.tok-superscript`
  * `.tok-table`
  * `.tok-tableCell`
  * `.tok-tableHeading`
  * Delimiters:
    * `tok-mark`
    * `tok-markAutolink`
    * `tok-markCode`
    * `tok-markCodeBlock`
    * `tok-markCodeInline`
    * `tok-markEmphasis`
    * `tok-markHeading`
    * `tok-markHeadingPrefixed`
    * `tok-markHeadingUnderlined`
    * `tok-markImage`
    * `tok-markLineBreak`
    * `tok-markLink`
    * `tok-markLinkImage`
    * `tok-markList`
    * `tok-markListOrdered`
    * `tok-markListUnordered`
    * `tok-markQuote`
    * `tok-markQuoteBlock`
    * `tok-markStrong`
    * `tok-markStrikethrough`
    * `tok-markSubscript`
    * `tok-markSuperscript`
    * `tok-markTable`


### CSS variables

* Fonts:
  * `--markupchisel-font-family` (default: `inherit`)
  * `--markupchisel-font-family-monospace` (default: `monospace`)
  * `--markupchisel-font-feature-settings` (default: `inherit`)
  * `--markupchisel-font-feature-settings-monospace` (default: `inherit`)
  * `--markupchisel-font-size-factor` (default: `1`)
  * `--markupchisel-font-size-factor-monospace` (default: `var(--markupchisel-font-size-factor)`)
* Extras (not available when using the `MarkupChiselBaseView` class):
  * Color schemes (`*`: `background`, `foreground`, and the ANSI color names below):
    * `--adwaita-*`
    * `--basic-*`
  * Background/foreground:
    * `--background`
    * `--foreground`
  * ANSI colors:
    * `--black`
    * `--dark-red`
    * `--dark-green`
    * `--dark-yellow`
    * `--dark-blue`
    * `--dark-magenta`
    * `--dark-cyan`
    * `--light-gray`
    * `--dark-gray`
    * `--red`
    * `--green`
    * `--yellow`
    * `--blue`
    * `--magenta`
    * `--cyan`
    * `--white`
  * Extra colors:
    * `--brown`
    * `--orange`
    * `--violet`
    * `--gray`
  * Selected XTerm colors:
    * `--xterm-darkorange3`
    * `--xterm-darkorange`
    * `--xterm-purple3`
    * `--xterm-mediumpurple1`
    * `--xterm-grey27`
    * `--xterm-grey42`
    * `--xterm-grey66`
    * `--xterm-grey85`
  * Logical colors (names from Vim):
    * `--comment`
    * `--constant`
    * `--identifier`
    * `--preproc`
    * `--special`
    * `--statement`
    * `--type`
  * Extra logical colors:
    * `--url`


## License

MarkupChisel is licensed under the 0BSD License; however, it makes use
of other components which are covered by other permissive licenses.
See [LICENSE.txt](./LICENSE.txt) for details.
