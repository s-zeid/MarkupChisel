export * from "../../src/index.js";
import { languageData } from "../../src/base.js";

import * as codemirror_languageData from "@codemirror/language-data";
languageData.push(...codemirror_languageData.languages);
