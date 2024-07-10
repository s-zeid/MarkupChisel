import * as commands from "@codemirror/commands";
import * as state from "@codemirror/state";
import * as view from "@codemirror/view";

const { Prec } = state;

import { MarkupChiselView } from "./main.js";


export { element as default };
export { element as MarkupChiselElement };
const element = class MarkupChiselElement extends HTMLElement {
  static NAME = "markup-chisel";

  static CSS = /* css */ `
    :host(:where(:not([hidden]))) {
      display: block; position: relative; height: var(--base-height);
      overflow: auto; resize: auto;
      font: medium system-ui;
      --base-height: calc(var(--computed-line-height, 1.2) * var(--rows, -1));
    }
    :host(:where([flex])) {
      min-height: var(--base-height);
      height: var(--flex-height, auto);
    }
    :host(:where(:not([hidden])):focus-within) {
      outline: 2px solid SelectedItem;
    }
    :host(:where(:not([disabled]))) {
      cursor: text;
    }
    #head {
      display: none;
    }
    main, [part~="input"] {
      display: block; width: 100%; height: 100%; min-height: var(--base-height);
      margin: 0; padding: 0; border: none; resize: none;
      font: inherit; line-height: inherit;
    }
    :where([part~="scroll"]) {
      padding-block-end: 0.0625em;
    }
    main, [part] {
      box-sizing: border-box;
    }
    main > *:focus {
      outline: none;
    }
    [part~="placeholder"]:not([hidden]) {
      display: inline-block; position: absolute; z-index: -1; margin: 0; padding: 0;
      width: 100%; height: 100%; min-height: var(--base-height);
      border: none; font: inherit; pointer-events: none; resize: none;
    }
    [part~="placeholder"]:not([hidden]), [part~="placeholder"]::placeholder {
      color: inherit; opacity: 1;
    }

    .cm-editor.cm-focused {
      outline: none;
    }
    .cm-editor :is(.cm-scroller, .cm-content) {
      min-height: 100%; height: auto;
    }
    .cm-editor :is(.cm-content, .cm-line) {
      padding: 0;
    }
    .cm-editor .cm-scroller {
      line-height: inherit;
    }
  `;

  static PRIVATE_CSS_PROPS = {
    "--rows": 2,
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.privateStyleProps = this.#setupPrivateStyleProps();

    this.head = this.ownerDocument.createElement("div");
    this.head.id = "head";
    this.shadowRoot.append(this.head);

    this.styleSheets = new Map();
    this.styleSheets.set("private", this.privateStyleProps.parentRule.parentStyleSheet),
    this.styleSheets.set("main", new this.ownerDocument.defaultView.CSSStyleSheet()),
    this.styleSheets.set("author", []),

    this.styleSheets.get("main").replaceSync(this.constructor.CSS);
    this.reorderStyleSheets();

    this.container = this.ownerDocument.createElement("main");
    this.container.part = "container";
    this.shadowRoot.append(this.container);

    this.placeholderElement = this.ownerDocument.createElement("textarea");
    this.placeholderElement.part = "placeholder";
    this.placeholderElement.setAttribute("role", "presentation");
    this.placeholderElement.setAttribute("aria-hidden", "true");
    this.placeholderElement.readOnly = true;
    this.placeholderElement.tabIndex = -1;
    this.shadowRoot.prepend(this.placeholderElement);

    const initialValue = this.innerHTML;

    this._clickListener = (event) => {
      if (!event.target?.closest(".cm-editor")) {
        this.focus();
      }
    };
    this._inputListener = (event) => {
      this._updatePlaceholderVisibility();
    };

    this.container.replaceChildren();
    this.#markupChisel = this._createMarkupChisel();
    this.element?.part.toggle("input", true);
    this.scrollElement?.part.toggle("scroll", true);
    this.focusElement?.part.toggle("focus", true);
    this.contentElement?.part.toggle("content", true);
    this.reorderStyleSheets();

    if (initialValue) {
      this.value = initialValue;
    }

    this.container.replaceChildren(this.element);
  }

  reorderStyleSheets() {
    const newList = [];
    const ourValues = Array.from(this.styleSheets.values());
    for (const styleSheets of this.shadowRoot.adoptedStyleSheets) {
      for (const styleSheet of Array.isArray(styleSheets) ? styleSheets : [styleSheets]) {
        if (!ourValues.includes(styleSheet)) {
          newList.push(styleSheet);
        }
      }
    }
    for (const [name, styleSheets] of this.styleSheets.entries()) {
      for (const styleSheet of Array.isArray(styleSheets) ? styleSheets : [styleSheets]) {
        styleSheet._name ??= name;
        newList.push(styleSheet);
      }
    }
    this.shadowRoot.adoptedStyleSheets.splice(
      0,
      this.shadowRoot.adoptedStyleSheets.length,
    );
    this.shadowRoot.adoptedStyleSheets.splice(
      0,
      this.shadowRoot.adoptedStyleSheets.length,
      ...newList,
    );
  }

  connectedCallback() {
    setComputedLineHeight(this, { style: this.privateStyleProps });
    this.addEventListener("click", this._clickListener);
    this.addEventListener("input", this._inputListener);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this._clickListener);
    this.removeEventListener("input", this._inputListener);
  }

  static observedAttributes = 
    "flex,placeholder,rows,no-autocapitalize,no-autocorrect,no-spellcheck,interactive".split(",");

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      const nameCC = name.replace(/-([a-z])/gi, (_, $1) => $1.toUpperCase());
      this[nameCC] = newValue;
    }
  }

  addExtension(extension) {
    return this.addExtensions(extension);
  }

  addExtensions(extensions) {
    this.markupChisel.dispatch({
      effects: state.StateEffect.appendConfig.of(extensions),
    });
  }

  addStyleSheet(cssTextOrCSSStyleSheetOrSheetElement) {
    return this.addStyleSheets(cssTextOrCSSStyleSheetOrSheetElement);
  }

  addStyleSheets(cssTextsOrCSSStyleSheetsOrSheetElements) {
    const defaultView = this.ownerDocument.defaultView;
    if (!Array.isArray(cssTextsOrCSSStyleSheetsOrSheetElements)) {
      cssTextsOrCSSStyleSheetsOrSheetElements = [cssTextsOrCSSStyleSheetsOrSheetElements];
    }
    for (const cssTextOrCSSStyleSheetOrEl of cssTextsOrCSSStyleSheetsOrSheetElements) {
      if (
        (
          cssTextOrCSSStyleSheetOrEl instanceof HTMLLinkElement &&
          cssTextOrCSSStyleSheetOrEl.relList.contains("stylesheet")
        ) ||
        cssTextOrCSSStyleSheetOrEl instanceof HTMLStyleElement
      ) {
        const styleEl = cssTextOrCSSStyleSheetOrEl.cloneNode(true);
        styleEl.classList.add("author");
        this.head.append(styleEl);
      } else {
        const CSSStyleSheet = defaultView.CSSStyleSheet;
        let styleSheet = cssTextOrCSSStyleSheetOrEl;
        if (!(styleSheet instanceof CSSStyleSheet)) {
          styleSheet = new CSSStyleSheet();
          styleSheet.replaceSync(cssTextOrCSSStyleSheetOrEl);
        }
        this.styleSheets.get("author").push(styleSheet);
      }
    }
    this.reorderStyleSheets();
  }

  get flex() {
    return this.hasAttribute("flex");
  }

  set flex(value) {
    this.toggleAttribute("flex", value != null);
  }

  get interactive() {
    return this.hasAttribute("interactive");
  }

  set interactive(value) {
    this.toggleAttribute("interactive", value != null);
    this.markupChisel.toggles.interactive.set(value);
  }

  get noAutocapitalize() {
    return this.hasAttribute("no-autocapitalize");
  }

  set noAutocapitalize(value) {
    this.toggleAttribute("no-autocapitalize", value != null);
    this.markupChisel.toggles.autocapitalize.set(!value);
  }

  get noAutocorrect() {
    return this.hasAttribute("no-autocorrect");
  }

  set noAutocorrect(value) {
    this.toggleAttribute("no-autocorrect", value != null);
    this.markupChisel.toggles.autocorrect.set(!value);
  }

  get noSpellcheck() {
    return this.hasAttribute("no-spellcheck");
  }

  set noSpellcheck(value) {
    this.toggleAttribute("no-spellcheck", value != null);
    this.markupChisel.toggles.spellcheck.set(!value);
  }

  get placeholder() {
    return this.placeholderElement.placeholder;
  }

  set placeholder(value) {
    this.placeholderElement.placeholder = value;
  }

  get rows() {
    return Number(this.privateStyleProps.getProperty("--rows"));
  }

  set rows(value) {
    let computed = value;
    if (value == null || value == "" || isNaN(value) || Math.abs(value) == Infinity) {
      computed = NaN;
    }
    computed = Number(computed);
    if (isNaN(computed)) {
      computed = this.constructor.PRIVATE_CSS_PROPS["--rows"];
    }
    this.privateStyleProps.setProperty("--rows", computed);
    if (value == null) {
      this.removeAttribute("rows");
    } else {
      this.setAttribute("rows", value);
    }
  }

  _updatePlaceholderVisibility(value) {
    value ??= this.value;
    this.placeholderElement.hidden = (value || "").length != 0;
  }

  #setupPrivateStyleProps() {
    if (!this.shadowRoot.adoptedStyleSheets) {
      return this.style;
    }
    const privateStyleSheet = new this.ownerDocument.defaultView.CSSStyleSheet();
    privateStyleSheet.replaceSync(`:host {}`);
    for (const [name, value] of Object.entries(this.constructor.PRIVATE_CSS_PROPS)) {
      privateStyleSheet.cssRules[0].style.setProperty(
        name.replace(/[A-Z]/g, ($0) => `-${$0.toLowerCase()}`),
        value,
      );
    }
    this.shadowRoot.adoptedStyleSheets.push(privateStyleSheet);
    return privateStyleSheet.cssRules[0].style;
  }

  blur() {
    this.focusElement.blur();
  }

  focus() {
    this.focusElement.focus();
  }

  #markupChisel = null;
  get markupChisel() {
    return this.#markupChisel;
  }

  get element() {
    return this.markupChisel.dom;
  }

  get contentElement() {
    return this.markupChisel.contentDOM;
  }

  get focusElement() {
    return this.markupChisel.contentDOM;
  }

  get scrollElement() {
    return this.markupChisel.scrollDOM;
  }

  _createMarkupChisel() {
    const markupChisel = new MarkupChiselView({
      root: this.shadowRoot || this.ownerDocument,
      extensions: [
        // Ensure Mod-Enter gets handled by the application
        Prec.low(view.keymap.of([
          { key: "Mod-Enter", run: view => true, },
        ])),
        // Dispatch input event when the user changes the document
        view.ViewPlugin.fromClass(class {
          constructor(view) {
            this.view = view;
            this.editorInputEventListener = (event) => {
              if (!event._fromMarkupChiselElement) {
                event.stopImmediatePropagation();
                return;
              }
            };
            this.view.dom.addEventListener("input", this.editorInputEventListener);
          }

          update(update) {
            if (
              update.docChanged &&
              update.transactions.some(txn => txn.annotation(state.Transaction.userEvent))
            ) {
              const event = new InputEvent("input", {
                bubbles: true,
                composed: true,
                data: "",  // TODO: implement
                inputType: "",  // TODO: implement
                isComposing: update.transactions.some(txn => txn.isUserEvent("input.type.compose")),
              });
              event._fromMarkupChiselElement = true;
              this.view.dom.dispatchEvent(event);
            }
          }

          destroy() {
            this.view.dom.removeEventListener("input", this.editorInputEventListener);
          }
        }),
      ],
    }, {
      interactive: true,  // needed to enable the ToggleCompartment
    });
    markupChisel.toggles.interactive.disable();

    return markupChisel;
  }

  get value() {
    return this.markupChisel.state.doc.toString();
  }

  set value(value) {
    this._updatePlaceholderVisibility(value);
    this.markupChisel.dispatch({ changes: { from: 0, to: this.markupChisel.state.doc.length, insert: value } });
  }

  getSelectedCharacterRange() {
    const selection = this.markupChisel.state.selection.asSingle();
    const anchor = selection.ranges[0].anchor;
    const head = selection.ranges[0].head;
    let [start, end, direction] = [0, 0, "none"];
    if (anchor > head) {
      [start, end, direction] = [head, anchor, "backward"];
    } else {
      [start, end, direction] = [anchor, head, (anchor == head) ? "none" : "forward"];
    }
    return [start, end, direction, this.markupChisel.state.sliceDoc(start, end)];
  }

  setSelectedCharacterRange(start, end, direction, text) {
    if (text != null) {
      this.markupChisel.dispatch({ changes: [{ from: start, to: end, insert: text }] });
      end = start + text.length;
    }
    let [anchor, head] = [start, end];
    if (direction == "backward") {
      [anchor, head] = [head, anchor];
    }
    const selection = state.EditorSelection.single(anchor, head);
    this.markupChisel.dispatch({ selection });
  }

  clearHistory() {
    this.markupChisel.clearHistory();
  }
}


function setComputedLineHeight(el, styleEl) {
  function resolveStyleEl() {
    return ((typeof styleEl == "function") ? styleEl(el) : styleEl) || el;
  }

  resolveStyleEl().style.setProperty(
    "--computed-line-height",
    window.getComputedStyle(el).lineHeight,
  );
}


window.customElements.define(element.NAME, element);
