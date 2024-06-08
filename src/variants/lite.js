export * from "../../src/index.js";
import { languageData } from "../../src/base.js";

import * as gen_languageData from "../../gen/language-data-lite.esm.js";
languageData.push(...gen_languageData.languages);
