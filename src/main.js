import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection } from "@codemirror/view";

import { MarkupChiselBaseView } from "./base.js";


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
    ...options,
  };

  function stringBoolean(s) {
    if (s != null && typeof s != "string") {
      return Boolean(s);
    }
    s = s.trim().toLowerCase();
    if (s == "true" || s == "on") {
      return true;
    } else if (s == "false" || s == "off" || s == "") {
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

  return [
    tweaksTheme,
    ...(options.systemHighlight ? [systemHighlightTheme] : []),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    EditorView.contentAttributes.of(contentAttributes),
  ];
}


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

  const variableHighlightTheme = EditorView.theme({
    "&": { background: "var(--background)", color: "var(--foreground)", },
    "& .tok-link": { color: "var(--violet)", },
    "& .tok-keyword": { color: "var(--statement)", },
    "& .tok-atom": { color: "var(--constant)", },
    "& .tok-bool": { color: "var(--constant)", },
    "& .tok-url": { color: "var(--url)", },
    "& .tok-labelName": { color: "var(--preproc)", },
    "& .tok-inserted": { color: "var(--black)", background: "var(--green)", },
    "& .tok-deleted": { color: "var(--black)", background: "var(--red)", },
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

    "& .tok-escape": { color: "var(--constant)", fontWeight: "bold", textDecoration: "underline", },
    "& .tok-contentSeparator": { color: "var(--comment)", opacity: "1", },
    "& .tok-markup.tok-mark": { color: "var(--comment)", fontStyle: "normal", },
    "& .tok-markup.tok-markQuoteBlock": { opacity: 0.75, },
  });

  return [
    colorVariablesTheme,
    variableHighlightTheme,
    palettes[options.palette] || palettes.basic,
  ];
}
