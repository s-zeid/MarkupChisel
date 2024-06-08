import * as codemirror_commands from "@codemirror/commands";
import * as codemirror_language from "@codemirror/language";
import * as codemirror_langMarkdown from "@codemirror/lang-markdown";
import * as codemirror_state from "@codemirror/state";
import * as codemirror_view from "@codemirror/view";

import * as lezer_highlight from "@lezer/highlight";

import { languageData } from "./base.js";

export const imports = {
  codemirror: {
    commands: codemirror_commands,
    language: codemirror_language,
    languageData: languageData,
    langMarkdown: codemirror_langMarkdown,
    state: codemirror_state,
    view: codemirror_view,
  },
  lezer: {
    highlight: lezer_highlight,
  },
};
