import * as commands from "@codemirror/commands";
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { Language, defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, drawSelection, highlightSpecialChars, keymap } from "@codemirror/view";
import { Tag, classHighlighter, styleTags, tagHighlighter, tags } from "@lezer/highlight";


export const languageData = [];


export class MarkupChiselBaseView extends EditorView {
  static DEFAULT_EXTRA_CONFIG = {
    addStyles: true,
    fxComposeTrailingFix: true,
  };

  constructor(cmConfig = {}, extraConfig = {}) {
    const locals = {};

    extraConfig = locals.extraConfig = {
      ...MarkupChiselBaseView.DEFAULT_EXTRA_CONFIG,
      ...extraConfig,
    };

    cmConfig = locals.cmConfig = { ...cmConfig };
    cmConfig.extensions = [
      MarkupChiselBaseView.EXTENSIONS,
      extraConfig.addStyles ? Prec.low(MarkupChiselBaseView.MARKDOWN_BASE_THEME) : [],
      cmConfig.extensions || [],
    ];

    super(cmConfig);
    this.markupChisel = locals;
    this.dom.dataset.markupchisel = "";

    // Partial workaround for compositions in Firefox not using the proper style
    // (this only fixes the case where the line already has a token span,
    // not when it has no text at all)
    if (extraConfig.fxComposeTrailingFix) {
      this.contentDOM.addEventListener(
        "beforeinput",
        this._beforeInputFxComposeTrailingFix,
      );
    }
  }

  _beforeInputFxComposeTrailingFix(event) {
    const selection = document.getSelection();
    if (
      selection.type == "Caret" && selection.rangeCount == 1 &&
      selection.anchorNode == selection.focusNode &&
      selection.anchorOffset == selection.focusOffset &&
      selection.focusNode instanceof Element &&
      selection.focusNode.childNodes.length == selection.focusOffset &&
      selection.focusNode.matches(".cm-line")
    ) {
      let node = selection.focusNode;
      while (node && !(node instanceof Text)) {
        node = node.childNodes.length ? node.childNodes[node.childNodes.length - 1] : null;
      }
      if (node && node.parentNode.matches(".tok-heading, .tok-code")) {
        selection.setBaseAndExtent(node, node.length, node, node.length);
      }
    }
  }

  static #tagMark = Tag.define();

  static TAGS = {
    autolink: Tag.define(),
    checkbox: Tag.define(),
    code: Tag.define(),
    codeBlock: Tag.define(),
    codeIndented: Tag.define(),
    codeInfo: Tag.define(tags.labelName),
    codeInline: Tag.define(),
    emoji: Tag.define(),
    entity: Tag.define(),
    headingPrefixed: Tag.define(),
    headingUnderlined: Tag.define(),
    image: Tag.define(tags.link),
    linkImage: Tag.define(tags.link),
    linkLabel: Tag.define(tags.labelName),
    linkReference: Tag.define(),
    linkTitle: Tag.define(tags.string),
    linkURL: Tag.define(),
    mark: this.#tagMark,
    markAutolink: Tag.define(this.#tagMark),
    markCode: Tag.define(this.#tagMark),
    markCodeBlock: Tag.define(this.#tagMark),
    markCodeIndented: Tag.define(this.#tagMark),  // currently not added by Lezer's Markdown parser
    markCodeInline: Tag.define(this.#tagMark),
    markEmphasis: Tag.define(this.#tagMark),
    markHeading: Tag.define(this.#tagMark),
    markHeadingPrefixed: Tag.define(this.#tagMark),
    markHeadingUnderlined: Tag.define(this.#tagMark),
    markImage: Tag.define(this.#tagMark),
    markLineBreak: Tag.define(this.#tagMark),
    markLink: Tag.define(this.#tagMark),
    markLinkImage: Tag.define(this.#tagMark),
    markList: Tag.define(this.#tagMark),
    markListOrdered: Tag.define(this.#tagMark),
    markListUnordered: Tag.define(this.#tagMark),
    markQuote: Tag.define(this.#tagMark),
    markQuoteBlock: Tag.define(this.#tagMark),
    markStrong: Tag.define(this.#tagMark),
    markStrikethrough: Tag.define(this.#tagMark),
    markSubscript: Tag.define(this.#tagMark),
    markSuperscript: Tag.define(this.#tagMark),
    markTable: Tag.define(this.#tagMark),
    punctuation: Tag.define(tags.processingInstruction),
    superscript: Tag.define(),
    subscript: Tag.define(),
    table: Tag.define(),
    tableCell: Tag.define(),
    tableHeading: Tag.define(),
  };

  static LANGUAGE = new Language(
    markdownLanguage.data,
    markdownLanguage.parser.configure({
      props: [
        styleTags({
          // Allow top-level Markdown to be distinguished from nested Markdown
          [markdownLanguage.parser.nodeSet.types.filter(type => type.isTop)[0].name]: [],
          // Redefined here to lower precedence
          "Emphasis/...": tags.emphasis,
          "StrongEmphasis/...": tags.strong,
          // Markdown delimiters
          "CodeMark": [this.TAGS.punctuation, this.TAGS.markCode, tags.monospace, this.TAGS.code],
          "CodeBlock/CodeMark": [this.TAGS.punctuation, this.TAGS.markCode, this.TAGS.markCodeIndented, this.TAGS.code],  // currently not added by Lezer's Markdown parser
          "FencedCode/CodeMark": [this.TAGS.punctuation, this.TAGS.markCode, this.TAGS.markCodeBlock, tags.monospace, this.TAGS.code],
          "InlineCode/CodeMark": [this.TAGS.punctuation, this.TAGS.markCode, this.TAGS.markCodeInline, this.TAGS.code],
          "Emphasis/EmphasisMark": [this.TAGS.punctuation, this.TAGS.markEmphasis],
          "StrongEmphasis/EmphasisMark": [this.TAGS.punctuation, this.TAGS.markStrong],
          "HardBreak": [this.TAGS.punctuation, this.TAGS.markLineBreak],
          "HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading],
          "ATXHeading1/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "ATXHeading2/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "ATXHeading3/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "ATXHeading4/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "ATXHeading5/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "ATXHeading6/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingPrefixed],
          "SetextHeading1/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingUnderlined],
          "SetextHeading2/HeaderMark": [this.TAGS.punctuation, this.TAGS.markHeading, this.TAGS.markHeadingUnderlined],
          "LinkMark": [this.TAGS.punctuation, this.TAGS.markLink],
          "Autolink/LinkMark": [this.TAGS.punctuation, this.TAGS.markAutolink],
          "Image/LinkMark": [this.TAGS.punctuation, this.TAGS.markImage],
          "Link/Image/LinkMark": [this.TAGS.punctuation, this.TAGS.markImage, this.TAGS.markLinkImage],
          "ListMark": [this.TAGS.punctuation, this.TAGS.markList, tags.monospace],
          "BulletList/ListItem/ListMark": [this.TAGS.punctuation, this.TAGS.markList, this.TAGS.markListUnordered, tags.monospace],
          "OrderedList/ListItem/ListMark": [this.TAGS.punctuation, this.TAGS.markList, this.TAGS.markListOrdered, tags.monospace],
          "QuoteMark": [this.TAGS.punctuation, this.TAGS.markQuote, this.TAGS.markQuoteBlock],
          // GFM delimiters
          "StrikethroughMark": [this.TAGS.punctuation, this.TAGS.markStrikethrough],
          "SubscriptMark": [this.TAGS.punctuation, this.TAGS.markSubscript, this.TAGS.subscript],
          "SuperscriptMark": [this.TAGS.punctuation, this.TAGS.markSuperscript, this.TAGS.superscript],
          "TableDelimiter": [this.TAGS.punctuation, this.TAGS.markTable, tags.monospace],
          // Markdown headings
          "ATXHeading1/...": [tags.heading1, this.TAGS.headingPrefixed],
          "ATXHeading2/...": [tags.heading2, this.TAGS.headingPrefixed],
          "ATXHeading3/...": [tags.heading3, this.TAGS.headingPrefixed],
          "ATXHeading4/...": [tags.heading4, this.TAGS.headingPrefixed],
          "ATXHeading5/...": [tags.heading5, this.TAGS.headingPrefixed],
          "ATXHeading6/...": [tags.heading6, this.TAGS.headingPrefixed],
          "SetextHeading1/...": [tags.heading1, this.TAGS.headingUnderlined, tags.monospace],
          "SetextHeading2/...": [tags.heading2, this.TAGS.headingUnderlined, tags.monospace],
          // Markdown nodes
          "Autolink/...": this.TAGS.autolink,  // <https://example.com/>
          "Autolink/URL": tags.url,
          "CodeBlock/...": [this.TAGS.code, this.TAGS.codeIndented, tags.monospace],
          "FencedCode/...": [this.TAGS.code, this.TAGS.codeBlock, tags.monospace],
          "InlineCode": [this.TAGS.code, this.TAGS.codeInline, tags.monospace, tags.string],
          "InlineCode/...": [this.TAGS.code, this.TAGS.codeInline, tags.monospace],
          "CodeInfo": this.TAGS.codeInfo,
          "CodeText": tags.string,
          "Entity": [tags.escape, this.TAGS.entity],
          "Image/...": this.TAGS.image,
          "Image/URL": [tags.url, this.TAGS.linkURL],
          "Link/Image/...": [this.TAGS.image, this.TAGS.linkImage],
          "Link/URL": [tags.url, this.TAGS.linkURL],
          "LinkLabel": this.TAGS.linkLabel,
          "LinkReference/...": this.TAGS.linkReference,
          "LinkReference/URL": [tags.url, this.TAGS.linkURL],
          "LinkTitle": this.TAGS.linkTitle,
          "URL": tags.url,
          // GFM nodes
          "Emoji": [this.TAGS.emoji, tags.character],
          "Superscript": this.TAGS.superscript,
          "Subscript": this.TAGS.subscript,
          "Table/...": [this.TAGS.table, tags.monospace],
          "TableHeader/...": [this.TAGS.table, this.TAGS.tableHeading, tags.heading, tags.monospace],
          "TableCell/...": [this.TAGS.table, this.TAGS.tableCell, tags.monospace],
          "TaskMarker": [tags.atom, this.TAGS.checkbox, tags.monospace],
        }),
      ],
    }),
    [],
    markdownLanguage.name,
  );

  static EXTENSIONS = [
    EditorView.lineWrapping,
    highlightSpecialChars(),
    drawSelection(),
    history(),
    keymap.of([
      ...defaultKeymap,
      // The Mod+U bindings for (undo|redo)Selection conflict with View Source
      ...historyKeymap.filter(binding => [redo, undo].includes(binding.run)),
    ]),

    EditorView.contentAttributes.of(view => ({
      style: [
        `--markupchisel-private-tab-size: ${view.state.facet(EditorState.tabSize)}ch`,
        `tab-size: var(--markupchisel-private-tab-size)`,
      ].join("; "),
    })),

    Prec.lowest([
      EditorState.tabSize.of(8),
      syntaxHighlighting(defaultHighlightStyle),
    ]),
    Prec.low([
      // Default token CSS classes
      // See <https://lezer.codemirror.net/docs/ref/#highlight.classHighlighter>
      syntaxHighlighting(classHighlighter),
      // CSS class for styling just top-level markup
      syntaxHighlighting({
        style: (tagList) => {
          return "tok-markup tok-markdown";
        },
        scope: (topNode) => {
          return this.LANGUAGE.parser.nodeSet.types.includes(topNode);
        },
      }),
      // Extra token CSS classes
      syntaxHighlighting(tagHighlighter([
        // Headings
        {tag: tags.heading1, class: "tok-heading1"},
        {tag: tags.heading2, class: "tok-heading2"},
        {tag: tags.heading3, class: "tok-heading3"},
        {tag: tags.heading4, class: "tok-heading4"},
        {tag: tags.heading5, class: "tok-heading5"},
        {tag: tags.heading6, class: "tok-heading6"},
        {tag: tags.heading6, class: "tok-heading6"},
        {tag: this.TAGS.headingPrefixed, class: "tok-headingPrefixed"},
        {tag: this.TAGS.headingUnderlined, class: "tok-headingUnderlined"},
        // Delimiters
        {tag: this.TAGS.mark, class: "tok-mark tok-markGeneric"},
        {tag: this.TAGS.markAutolink, class: "tok-mark tok-markAutolink"},
        {tag: this.TAGS.markCode, class: "tok-mark tok-markCode"},
        {tag: this.TAGS.markCodeBlock, class: "tok-mark tok-markCodeBlock"},
        {tag: this.TAGS.markCodeIndented, class: "tok-mark tok-markCodeIndented"},  // currently not added by Lezer's Markdown parser
        {tag: this.TAGS.markCodeInline, class: "tok-mark tok-markCodeInline"},
        {tag: this.TAGS.markEmphasis, class: "tok-mark tok-markEmphasis"},
        {tag: this.TAGS.markHeading, class: "tok-mark tok-markHeading"},
        {tag: this.TAGS.markHeadingPrefixed, class: "tok-mark tok-markHeadingPrefixed"},
        {tag: this.TAGS.markHeadingUnderlined, class: "tok-mark tok-markHeadingUnderlined"},
        {tag: this.TAGS.markImage, class: "tok-mark tok-markImage"},
        {tag: this.TAGS.markLineBreak, class: "tok-mark tok-markLineBreak"},
        {tag: this.TAGS.markLink, class: "tok-mark tok-markLink"},
        {tag: this.TAGS.markLinkImage, class: "tok-mark tok-markLinkImage"},
        {tag: this.TAGS.markList, class: "tok-mark tok-markList"},
        {tag: this.TAGS.markListOrdered, class: "tok-mark tok-markListOrdered"},
        {tag: this.TAGS.markListUnordered, class: "tok-mark tok-markListUnordered"},
        {tag: this.TAGS.markQuote, class: "tok-mark tok-markQuote"},
        {tag: this.TAGS.markQuoteBlock, class: "tok-mark tok-markQuoteBlock"},
        {tag: this.TAGS.markStrong, class: "tok-mark tok-markStrong"},
        {tag: this.TAGS.markStrikethrough, class: "tok-mark tok-markStrikethrough"},
        {tag: this.TAGS.markSubscript, class: "tok-mark tok-markSubscript"},
        {tag: this.TAGS.markSuperscript, class: "tok-mark tok-markSuperscript"},
        {tag: this.TAGS.markTable, class: "tok-mark tok-markTable"},
        // Others
        {tag: this.TAGS.autolink, class: "tok-autolink"},
        {tag: this.TAGS.checkbox, class: "tok-checkbox"},
        {tag: this.TAGS.code, class: "tok-code"},
        {tag: this.TAGS.codeBlock, class: "tok-codeBlock"},
        {tag: this.TAGS.codeIndented, class: "tok-codeIndented"},
        {tag: this.TAGS.codeInline, class: "tok-codeInline"},
        {tag: tags.contentSeparator, class: "tok-contentSeparator"},
        {tag: this.TAGS.emoji, class: "tok-emoji"},
        {tag: this.TAGS.entity, class: "tok-entity"},
        {tag: tags.escape, class: "tok-escape"},
        {tag: this.TAGS.image, class: "tok-image"},
        {tag: this.TAGS.linkImage, class: "tok-linkImage"},
        {tag: this.TAGS.linkLabel, class: "tok-linkLabel"},
        {tag: this.TAGS.linkReference, class: "tok-linkReference"},
        {tag: this.TAGS.linkTitle, class: "tok-linkTitle"},
        {tag: this.TAGS.linkURL, class: "tok-linkURL"},
        {tag: this.TAGS.codeInfo, class: "tok-codeInfo"},
        {tag: tags.monospace, class: "tok-monospace"},
        {tag: this.TAGS.punctuation, class: "tok-punctuation"},
        {tag: tags.quote, class: "tok-quote"},
        {tag: tags.strikethrough, class: "tok-strikethrough"},
        {tag: this.TAGS.subscript, class: "tok-subscript"},
        {tag: this.TAGS.superscript, class: "tok-superscript"},
        {tag: this.TAGS.table, class: "tok-table"},
        {tag: this.TAGS.tableCell, class: "tok-tableCell"},
        {tag: this.TAGS.tableHeading, class: "tok-tableHeading"},
      ])),
      // Nested code blocks
      syntaxHighlighting({
        style: (tagList) => {
          return "tok-code tok-monospace tok-nested";
        },
        scope: (topNode) => {
          return !this.LANGUAGE.parser.nodeSet.types.includes(topNode);
        },
      }),
    ]),

    markdown({
      codeLanguages: languageData,
      base: this.LANGUAGE,
    }),
  ];

  static CSS_CALC_FONT_SIZE = "calc(var(--markupchisel-private-font-size) * var(--markupchisel-private-font-size-factor))";

  static MARKDOWN_BASE_THEME = EditorView.baseTheme({
    "& .cm-scroller, & .cm-content": {
      fontFamily: "var(--markupchisel-font-family, inherit)",
      fontFeatureSettings: "var(--markupchisel-font-feature-settings, inherit)",
      fontSize: this.CSS_CALC_FONT_SIZE,
      "--markupchisel-private-font-size": "1em",
      "--markupchisel-private-font-size-factor": "var(--markupchisel-font-size-factor, 1)",
    },
    "& .tok-monospace, & .cm-specialChar": {
      fontFamily: "var(--markupchisel-font-family-monospace, monospace)",
      fontFeatureSettings: "var(--markupchisel-font-feature-settings-monospace, inherit)",
      "--markupchisel-private-font-size-factor": "var(--markupchisel-font-size-factor-monospace, var(--markupchisel-font-size-factor, 1))",
      fontSize: this.CSS_CALC_FONT_SIZE,
    },
    "& .tok-monospace:not(.tok-headingUnderlined), & .cm-specialChar": {
      lineHeight: "1",
    },

    "& .cm-content *": { tabSize: "var(--markupchisel-private-tab-size, 8)", textDecorationThickness: "0.0625em", },

    "& .tok-heading": { textDecorationLine: "none", fontSize: this.CSS_CALC_FONT_SIZE, },
    "& .tok-heading1": { "--markupchisel-private-font-size": "2em", },
    "& .tok-heading2": { "--markupchisel-private-font-size": "1.5em", },
    "& .tok-heading3": { "--markupchisel-private-font-size": "1.2em", },
    "& .tok-heading4": { "--markupchisel-private-font-size": "1em", },
    "& .tok-heading5": { "--markupchisel-private-font-size": "0.875em", },
    "& .tok-heading6": { "--markupchisel-private-font-size": "0.75em", },
    "& .tok-nested.tok-heading": { "--markupchisel-private-font-size": "1em", },

    // thinner Setext delimiters
    "& .cm-line:has(.tok-markHeadingUnderlined)": { lineHeight: "0.5", marginBlock: "0 0.125em", },

    "& .tok-contentSeparator": { opacity: "0.625", },
    "& .tok-escape": { fontWeight: "bold", textDecorationLine: "underline", },
    "& .tok-image": { textDecorationLine: "underline overline", textDecorationStyle: "dashed", },
    "& .tok-linkImage": { textDecorationLine: "underline overline", textDecorationStyle: "solid", },
    "& :where(.tok-markup).tok-mark": { color: "color-mix(in hsl, currentColor, rgba(128 128 128 / calc(1 - 0.625)) 50%)", },
    "& .tok-markup.tok-markCode": { fontWeight: "bold", textShadow: "0 0 1px currentColor", },
    "& .tok-markup.tok-markCodeBlock:first-child:last-child": { lineHeight: "0", verticalAlign: "-0.375em", },
    "& :where(.tok-markup).tok-markQuote:first-child": { color: "color-mix(in hsl, currentColor, rgba(128 128 128 / calc(1 - 0.625)) calc(50% / 0.75))", },
    "& .tok-superscript": { verticalAlign: "super", fontSize: "smaller", },
    "& .tok-subscript": { verticalAlign: "sub", fontSize: "smaller", },
    "& .tok-url:not(.tok-linkURL)": { textDecorationLine: "underline", },

    // Remove underline from links, except for link text
    "& .tok-markup:is(.tok-markLink, .tok-markImage, .tok-link.tok-linkURL, .tok-link.tok-linkURL + .tok-link:not(.tok-markLink), .tok-link.tok-linkTitle, .tok-link.tok-linkLabel)": { textDecorationLine: "none", },
  });
}
