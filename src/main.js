import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import { EditorView, ViewPlugin, drawSelection } from "@codemirror/view";

import { MarkupChiselBaseView, ToggleCompartment } from "./base.js";


export class MarkupChiselView extends MarkupChiselBaseView {
  constructor(cmConfig = {}, extraConfig = {}) {
    cmConfig = { ...cmConfig };
    cmConfig.extensions = [
      MarkupChiselTweaks(extraConfig),
      MarkupChiselColors(extraConfig),
      cmConfig.extensions || [],
    ];

    super(cmConfig, extraConfig);
  }
}


export function MarkupChiselTweaks(options) {
  options = {
    autocapitalize: "sentences",  // HTML attribute value, or Boolean (sentences or none)
    autocorrect: true,
    spellcheck: true,
    systemHighlight: false,
    interactive: false,
    ...options,
  };

  options.interactive = {
    links: false,
    checkboxes: false,
    ...((typeof options.interactive == "object") ? options.interactive : {}),
    __default: (typeof options.interactive == "boolean") ? options.interactive : null,
  };
  if (options.interactive.__default != null) {
    for (const key of Object.keys(options.interactive)) {
      options.interactive[key] = options.interactive.__default;
    }
  }

  function stringBoolean(s) {
    if (s != null && typeof s != "string") {
      return Boolean(s);
    }
    s = s.trim().toLowerCase();
    if (s == "true" || s == "on") {
      return true;
    } else if (s == "false" || s == "off" || s == "none" || s == "") {
      return false;
    } else {
      return null;
    }
  }

  const contentAttributes = {
    spellcheck: stringBoolean(options.spellcheck) ? "true" : "false",
    autocorrect: stringBoolean(options.autocorrect) ? "on" : "off",
    autocapitalize: (typeof options.autocapitalize != "string") ? (
      Boolean(options.autocapitalize) ? "sentences" : "none"
    ) : (
      options.autocapitalize || "none"
    ),
  };
  const attributeToggleCompartments = Object.entries(contentAttributes).map(
    ([name, value]) => {
      return new ToggleCompartment(
        EditorView.contentAttributes.of({ [name]: value }),
        name,
        stringBoolean(value) ?? Boolean(value),
      );
    },
  );

  const tweaksTheme = EditorView.theme({
    // Use native caret with currentColor
    "&.cm-editor .cm-content, &.cm-focused .cm-line": { caretColor: "currentColor !important", },
    "&.cm-focused .cm-cursor": { opacity: "0", },
    // Use --highlight/--highlight-text for selection colors
    // --highlight-text defaults to nothing
    "&.cm-editor .cm-selectionBackground": {
      background: "var(--highlight, #808080) !important",
      color: "var(--highlight-text) !important",
    },
    "&.cm-editor .cm-line::selection, &.cm-editor .cm-line ::selection": {
      background: "transparent !important",
    },
  });

  const systemHighlightTheme = EditorView.theme({
    "&": {
      "--highlight": "Highlight",
      "--highlight-text": "HighlightText",
    },
  });

  const useInteractiveExtensions = Object.entries(interactiveExtensions).map(([k, v]) => {
    return Boolean(options.interactive[k]) ? v : null;
  }).filter(v => v != null);
  if (useInteractiveExtensions.length > 0) {
    useInteractiveExtensions.unshift(
      EditorView.editorAttributes.of({ class: "interactive" }),
    );
  }
  const interactiveToggleCompartment = new ToggleCompartment(
    useInteractiveExtensions,
    "interactive",
    useInteractiveExtensions.length > 0,
  );

  return [
    tweaksTheme,
    (options.systemHighlight ? [systemHighlightTheme] : []),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    attributeToggleCompartments,
    interactiveToggleCompartment,
  ];
}


export const interactiveExtensions = {
  checkboxes: [
    // Toggle checkboxes on click (without modifier key)
    // Double-click changes between [x] and [X]
    EditorView.editorAttributes.of({ class: "interactive-checkboxes" }),
    EditorView.baseTheme({
      "&.interactive-checkboxes .tok-markup.tok-checkbox": { cursor: "pointer", },
    }),
    ViewPlugin.fromClass(class {
      constructor(view) {
        this.view = view;
        this.clickListener = (event) => {
          const el = event.target;
          const mod = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
          if (!mod && el.matches(".tok-markup.tok-checkbox")) {
            const oldValue = el.textContent;
            const checked = oldValue.trim() != "[ ]";
            const newValue = checked ? "[ ]" : "[x]";
            const start = this.view.posAtDOM(el);
            const selection = getSelectedCharacterRange(this.view).slice(0, 3);
            view.dispatch({ changes: { from: start, to: start + oldValue.length, insert: newValue }, annotations: Transaction.userEvent.of("input") });
            setSelectedCharacterRange(this.view, ...selection);
            el.__interactiveCheckboxState ??= {
              previous2Values: [null, null],
            };
            el.__interactiveCheckboxState.previous2Values.shift();
            el.__interactiveCheckboxState.previous2Values.push(oldValue);
          }
        };
        this.dblclickListener = (event) => {
          const el = event.target;
          const mod = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
          if (!mod && el.matches(".tok-markup.tok-checkbox")) {
            const oldValue = el.textContent;
            let newValue = "[X]";
            if (el.__interactiveCheckboxState?.previous2Values[0]?.trim() == "[X]") {
              newValue = "[x]";
            }
            const start = this.view.posAtDOM(el);
            const selection = getSelectedCharacterRange(this.view).slice(0, 3);
            view.dispatch({ changes: { from: start, to: start + oldValue.length, insert: newValue }, annotations: Transaction.userEvent.of("input") });
            setSelectedCharacterRange(this.view, ...selection);
          }
        };
        this.view.dom.addEventListener("click", this.clickListener);
        this.view.dom.addEventListener("dblclick", this.dblclickListener);
      }
      destroy() {
        this.view.dom.removeEventListener("click", this.clickListener);
        this.view.dom.removeEventListener("dblclick", this.dblclickListener);
      }
    }),
  ],

  links: [
    // Open links on double-click (without modifier key)
    // Double-clicking on a link reference label highlights the URL in the reference
    EditorView.editorAttributes.of({ class: "interactive-links" }),
    EditorView.baseTheme({
      "&.interactive-links .tok-markup:is(.tok-link, .tok-url):not(.tok-markLink, .tok-markImage, .tok-image.tok-url, .tok-image:not(.tok-linkImage))": { cursor: "pointer", },
    }),
    ViewPlugin.fromClass(class {
      constructor(view) {
        this.view = view;
        this.multiClickListener = (event) => {
          if (!(
            event.type == "dblclick" ||
            event.type == "auxclick" && event.button == 1
          )) {
            return;
          }
          const el = event.target;
          const mod = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
          if (
            mod ||
            !el.matches(".tok-markup:is(.tok-link, .tok-url):not(.tok-markLink, .tok-markImage, .tok-image.tok-url, .tok-image:not(.tok-linkImage))")
          ) {
            return;
          }
          const isImageLink = el.matches(".tok-linkImage:not(.tok-url)");
          let url, linkReferenceEl;
          if (el.matches(".tok-url")) {
            url = el.textContent.trim();
          } else {
            const findNextVisitor = (visit) => {
              if (visit.nextElementSibling) {
                return visit.nextElementSibling;
              }
              let visitLine = visit.closest(".cm-line")?.nextElementSibling;
              for (visitLine; visitLine; visitLine = visitLine.nextElementSibling) {
                if (visitLine?.children?.[0]) {
                  return visitLine.children[0];
                }
              }
            };
            let visit = findNextVisitor(el);
            let linkReference = "";
            if (el.matches(".tok-link.tok-linkLabel")) {
              linkReference = el.textContent.trim();
            }
            let inLinkReference = false;
            let matchedLinkReference = false;
            for (visit; visit; visit = findNextVisitor(visit)) {
              if (visit.matches(".tok-linkReference")) {
                inLinkReference = true;
                if (visit.matches(".tok-linkLabel") && visit.textContent.trim() == linkReference) {
                  matchedLinkReference = true;
                }
              } else {
                inLinkReference = matchedLinkReference = false;
              }
    
              if (!linkReference && visit.matches(".tok-link.tok-linkLabel")) {
                linkReference = visit.textContent.trim();
              } else if (!linkReference || inLinkReference) {
                if (visit.matches(".tok-markLink, .tok-markAutolink") && "[<".includes(visit.textContent.trim())) {
                  break;
                }
                if (visit.matches(".tok-image.tok-url")) {
                  continue;
                }
                if (visit.matches(".tok-url") && (!inLinkReference || matchedLinkReference)) {
                  url = visit.textContent.trim();
                  if (inLinkReference && matchedLinkReference) {
                    linkReferenceEl = visit;
                  }
                  break;
                }
              }

              if (!linkReference && !visit.nextElementSibling) {
                break;
              }
            }
          }
          if (linkReferenceEl && el.matches(".tok-linkLabel")) {
            const pos = view.posAtDOM(linkReferenceEl);
            const selection = EditorSelection.single(pos, pos + linkReferenceEl.textContent.length);
            view.dispatch({ selection, effects: [EditorView.scrollIntoView(
              pos,
              { y: "center", x: "center" },
            )] });
          } else if (url) {
            const selection = getSelectedCharacterRange(this.view).slice(0, 3);
            selection[1] = selection[0];
            setSelectedCharacterRange(this.view, ...selection);
            window.open(url, "_blank", "noopener,noreferrer");
          }
        };
        this.view.dom.addEventListener("auxclick", this.multiClickListener);
        this.view.dom.addEventListener("dblclick", this.multiClickListener);
      }
      destroy() {
        this.view.dom.removeEventListener("auxclick", this.multiClickListener);
        this.view.dom.removeEventListener("dblclick", this.multiClickListener);
      }
    }),
  ],
};


export function MarkupChiselColors(options) {
  options = {
    palette: "adwaita",
    ...options,
  };

  const colorVariablesTheme = EditorView.theme({
    "&": {
      /* XTerm */
      "--xterm-darkorange3": "#AF5F00",
      "--xterm-darkorange": "#FF8700",
      "--xterm-purple3": "#5F00D7",
      "--xterm-mediumpurple1": "#AF87FF",
      "--xterm-grey27": "#444444",
      "--xterm-grey42": "#6C6C6C",
      "--xterm-grey66": "#A8A8A8",
      "--xterm-grey85": "#DADADA",

      /* Extra color names */
      "--brown": "var(--xterm-darkorange3)",
      "--orange": "var(--xterm-darkorange)",
      "--violet": "var(--xterm-purple3)",
      "--gray": "var(--xterm-grey42)",

      /* Logical color names (from Vim) */
      "--comment": "var(--gray)",
      "--constant": "var(--darkred)",
      "--identifier": "var(--darkblue)",
      "--preproc": "var(--darkcyan)",
      "--special": "var(--violet)",
      "--statement": "var(--brown)",
      "--type": "var(--darkgreen)",

      /* Extra logical color names */
      "--url": "var(--darkblue)",
      "--highlight": "var(--xterm-grey85)",
    },
    "@media (prefers-color-scheme: dark)": {
      "&": {
        /* Extra color names */
        "--violet": "var(--xterm-mediumpurple1)",
        "--gray": "var(--xterm-grey66)",

        /* Logical color names (from Vim) */
        "--constant": "var(--red)",
        "--identifier": "var(--blue)",

        /* Extra logical color names */
        "--url": "var(--blue)",
        "--highlight": "var(--xterm-grey27)",
      },
    },
  });

  const palettes = {
    "basic": EditorView.theme({
      "&": {
        "--basic-black": "#000",
        "--basic-darkred": "#800",
        "--basic-darkgreen": "#080",
        "--basic-darkyellow": "#880",
        "--basic-darkblue": "#008",
        "--basic-darkmagenta": "#808",
        "--basic-darkcyan": "#088",
        "--basic-lightgray": "#CCC",
        "--basic-darkgray": "#888",
        "--basic-red": "#F00",
        "--basic-green": "#0F0",
        "--basic-yellow": "#FF0",
        "--basic-blue": "#00F",
        "--basic-magenta": "#F0F",
        "--basic-cyan": "#0FF",
        "--basic-white": "#FFF",
        "--basic-background": "#FFF",
        "--basic-foreground": "#000",

        "--black": "var(--basic-black)",
        "--darkred": "var(--basic-darkred)",
        "--darkgreen": "var(--basic-darkgreen)",
        "--darkyellow": "var(--basic-darkyellow)",
        "--darkblue": "var(--basic-darkblue)",
        "--darkmagenta": "var(--basic-darkmagenta)",
        "--darkcyan": "var(--basic-darkcyan)",
        "--lightgray": "var(--basic-lightgray)",
        "--darkgray": "var(--basic-darkgray)",
        "--red": "var(--basic-red)",
        "--green": "var(--basic-green)",
        "--yellow": "var(--basic-yellow)",
        "--blue": "var(--basic-blue)",
        "--magenta": "var(--basic-magenta)",
        "--cyan": "var(--basic-cyan)",
        "--white": "var(--basic-white)",
        "--background": "var(--basic-background)",
        "--foreground": "var(--basic-foreground)",
      },
    }),
    "adwaita": EditorView.theme({
      "&": {
        /* \`-light\`: darks adjusted for contrast */
        "--adwaita-black": "#241F31",
        "--adwaita-darkred": "#C01C28",
        "--adwaita-darkgreen": "#2EC27E",
        "--adwaita-darkgreen-light": "#208657",
        "--adwaita-darkyellow": "#F5C211",
        "--adwaita-darkyellow-light": "#AE650C",
        "--adwaita-darkblue": "#1E78E4",
        "--adwaita-darkblue-light": "#1861B9",
        "--adwaita-darkmagenta": "#9841BB",
        "--adwaita-darkcyan": "#0AB9DC",
        "--adwaita-darkcyan-light": "#05687B",
        "--adwaita-lightgray": "#C0BFBC",
        "--adwaita-darkgray": "#5E5C64",
        "--adwaita-red": "#ED333B",
        "--adwaita-green": "#57E389",
        "--adwaita-yellow": "#F8E45C",
        "--adwaita-blue": "#51A1FF",
        "--adwaita-magenta": "#C061CB",
        "--adwaita-cyan": "#4FD2FD",
        "--adwaita-white": "#F6F5F4",
        "--adwaita-background": "#1E1E1E",
        "--adwaita-background-light": "#FFFFFF",
        "--adwaita-foreground": "#FFFFFF",
        "--adwaita-foreground-light": "#000000",

        "--black": "var(--adwaita-black)",
        "--darkred": "var(--adwaita-darkred)",
        "--darkgreen": "var(--adwaita-darkgreen-light)",
        "--darkyellow": "var(--adwaita-darkyellow-light)",
        "--darkblue": "var(--adwaita-darkblue-light)",
        "--darkmagenta": "var(--adwaita-darkmagenta)",
        "--darkcyan": "var(--adwaita-darkcyan-light)",
        "--lightgray": "var(--adwaita-lightgray)",
        "--darkgray": "var(--adwaita-darkgray)",
        "--red": "var(--adwaita-red)",
        "--green": "var(--adwaita-green)",
        "--yellow": "var(--adwaita-yellow)",
        "--blue": "var(--adwaita-blue)",
        "--magenta": "var(--adwaita-magenta)",
        "--cyan": "var(--adwaita-cyan)",
        "--white": "var(--adwaita-white)",
        "--background": "var(--adwaita-background-light)",
        "--foreground": "var(--adwaita-foreground-light)",
      },
      "@media (prefers-color-scheme: dark)": {
        "&": {
          "--darkgreen": "var(--adwaita-darkgreen)",
          "--darkyellow": "var(--adwaita-darkyellow)",
          "--darkblue": "var(--adwaita-darkblue)",
          "--darkcyan": "var(--adwaita-darkcyan)",
          "--background": "var(--adwaita-background)",
          "--foreground": "var(--adwaita-foreground)",
        },
      },
    }),
  };

  function opacityGradient(color, opacity) {
    opacity = Number(opacity);
    return `linear-gradient(0, ${color} calc(-${2**31}% * (1 - ${opacity})), transparent calc(${2**31-1}% * ${opacity}));`;
  }

  const variableHighlightTheme = EditorView.theme({
    "&": { background: "var(--background)", color: "var(--foreground)", },
    "& .tok-link": { color: "var(--violet)", },
    "& .tok-keyword": { color: "var(--statement)", },
    "& .tok-atom": { color: "var(--constant)", },
    "& .tok-bool": { color: "var(--constant)", },
    "& .tok-url": { color: "var(--url)", },
    "& .tok-labelName": { color: "var(--preproc)", },
    "& .tok-inserted": { color: "var(--black)", background: opacityGradient("var(--green)", 0.375), },
    "& .tok-deleted": { color: "var(--black)", background: opacityGradient("var(--red)", 0.375), },
    "& .tok-literal": { color: "var(--constant)", },
    "& .tok-string": { color: "var(--constant)", },
    "& .tok-number": { color: "var(--constant)", },
    "& .tok-variableName": { color: "var(--identifier)", },
    "& .tok-typeName": { color: "var(--type)", },
    "& .tok-namespace": { color: "var(--identifier)", },
    "& .tok-className": { color: "var(--identifier)", },
    "& .tok-macroName": { color: "var(--preproc)", },
    "& .tok-propertyName": { color: "var(--identifier)", },
    "& .tok-operator": { color: "var(--statement)", },
    "& .tok-comment": { color: "var(--comment)", fontStyle: "italic", },
    "& .tok-meta": { color: "var(--preproc)", },
    "& .tok-punctuation": { color: "var(--statement)", },
    "& .tok-invalid": { color: "var(--white)", background: "var(--red)", },
    "& .tok-string2": { color: "var(--special)", },
    "& .tok-variableName2": { color: "var(--special)", },
    "& .tok-variableName.tok-local": { color: "var(--identifier)", },
    "& .tok-variableName.tok-definition": { color: "var(--identifier)", },
    "& .tok-propertyName.tok-definition": { color: "var(--identifier)", },

    "& .tok-escape": { color: "var(--constant)", fontWeight: "bold", textDecorationLine: "underline", },
    "& .tok-contentSeparator": { color: "var(--comment)", opacity: "1", },
    "& .tok-markup.tok-mark": { "--markupchisel-private-color-mark": "var(--comment)", color: "var(--markupchisel-private-color-mark)", fontStyle: "normal", },
    "& .tok-markup:is(.tok-markQuoteBlock, .tok-lighter, :has(.tok-lighter))": { color: "var(--markupchisel-private-color-mark)", opacity: 0.75, },
    "& .tok-markup:is(.tok-markEmphasis, .tok-markStrong):is(.tok-lighter, :has(.tok-lighter))": { color: "var(--markupchisel-private-color-mark)", opacity: 0.625, },
  });

  return [
    colorVariablesTheme,
    variableHighlightTheme,
    palettes[options.palette] || palettes.basic,
  ];
}


function getSelectedCharacterRange(view) {
  const selection = view.state.selection.asSingle();
  const anchor = selection.ranges[0].anchor;
  const head = selection.ranges[0].head;
  let [start, end, direction] = [0, 0, "none"];
  if (anchor > head) {
    [start, end, direction] = [head, anchor, "backward"];
  } else {
    [start, end, direction] = [anchor, head, (anchor == head) ? "none" : "forward"];
  }
  return [start, end, direction, view.state.sliceDoc(start, end)];
}


function setSelectedCharacterRange(view, start, end, direction, text) {
  if (text != null) {
    view.dispatch({ changes: [{ from: start, to: end, insert: text }] });
    end = start + text.length;
  }
  let [anchor, head] = [start, end];
  if (direction == "backward") {
    [anchor, head] = [head, anchor];
  }
  const selection = EditorSelection.single(anchor, head);
  view.dispatch({ selection });
}
