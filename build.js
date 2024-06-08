import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as process from "node:process";

import * as esbuild from "esbuild";
import * as terser from "terser";


const NAME = "MarkupChisel";
const FILENAME = NAME.toLowerCase().replace(/ /g, "-");
const GLOBALNAME = NAME.replace(/ /g, "").replace(/[^a-zA-Z0-9_$]/g, "_");

const LICENSES = {
  "LICENSE.txt": {
    [NAME]: "./src/LICENSE.txt.in",
    "CodeMirror": "./node_modules/@codemirror/view/LICENSE",
    "-CRELT": "./node_modules/crelt/LICENSE",
    "-style-mod": "./node_modules/style-mod/LICENSE",
    "-w3c-keyname": "./node_modules/w3c-keyname/LICENSE",
    "Lezer Parser": "./node_modules/@lezer/common/LICENSE",
  },
  "test/LICENSE.txt": {
    "test/index.html": "0BSD",
    [NAME]: "See `LICENSE.txt`.",
    "Inter": "./node_modules/inter-ui/LICENSE.txt",
    "Roboto Mono": "./node_modules/@fontsource/roboto-mono/LICENSE",
  }
};

const LITE_LANGUAGES = JSON.parse(
  await fs.readFile("src/lite-languages.json", { encoding: "utf-8" }),
);

async function build() {
  process.chdir(path.dirname(process.argv[1]));
  await fs.mkdir("dist/import", { recursive: true });
  await fs.mkdir("gen", { recursive: true });

  const licenseTxtFiles = { ...LICENSES };
  for (const [file, licenses] of Object.entries(licenseTxtFiles)) {
    licenseTxtFiles[file] = await buildLicenseTxt(licenses);
    await fs.writeFile(file, licenseTxtFiles[file]);
  }

  await fs.copyFile("LICENSE.txt", "dist/LICENSE.txt");

  const defaults = {
    platform: "browser",
    banner: {
      js: `/*! LICENSE\n\n${licenseTxtFiles["LICENSE.txt"]}\n\n*/`,
    },
  };

  const bundle = {
    ...defaults,
    bundle: true,
    minify: true,
    treeShaking: true,
  };

  await esbuild.build({
    outfile: `gen/language-data-lite.esm.js`,
    ...defaults,
    stdin: {
      contents: await makeLanguageDataLite(LITE_LANGUAGES),
      sourcefile: "language-data-lite.js",
      resolveDir: "node_modules",
    },
    format: "esm",
  });

  const variants = {
    full: {
      entryPoints: [`src/variants/full.js`],
    },
    lite: {
      entryPoints: [`src/variants/lite.js`],
    },
    nano: {
      entryPoints: [`src/variants/nano.js`],
    },
  };

  for (const variant of Object.keys(variants)) {
    const variantOptions = variants[variant];

    await esbuild.build({
      outfile: `dist/import/${FILENAME}.${variant}.esm.js`,
      ...defaults,
      ...variantOptions,
      format: "esm",
    });

    await esbuild.build({
      outfile: `dist/${FILENAME}.${variant}.bundle.esm.js`,
      ...bundle,
      ...variantOptions,
      format: "esm",
    });

    await esbuild.build({
      outfile: `dist/${FILENAME}.${variant}.bundle.iife.js`,
      ...bundle,
      ...variantOptions,
      format: "iife",
      globalName: GLOBALNAME,
    });
  }
}


async function buildLicenseTxt(licenses) {
  let result = "";

  for (let [component, spec] of Object.entries(licenses)) {
    let level = 1;
    if (component.startsWith("\\")) {
      component = component.slice(1);
    } else if (component.startsWith("-")) {
      level += 1;
      component = component.slice(1);
    }
    result += component + "\n";
    result += (level > 1 ? "-" : "=").repeat(component.length) + "\n\n";
    let text;
    if (spec.startsWith("./")) {
      text = (await fs.readFile(spec, { encoding: "utf-8" })).trim();
    } else {
      text = spec.trim();
    }
    result += text;
    result += "\n\n\n";
  }

  return result.trim() + "\n";
}


async function makeLanguageDataLite(keep, debug = false) {
  keep = {
    extensions: [],
    filenames: [],
    names: [],
    ...(keep ?? {}),
  };

  const { ast } = await terser.minify({
    "language-data/index.js": await fs.readFile("node_modules/@codemirror/language-data/dist/index.js", { encoding: "utf-8" }),
  }, {
    compress: { defaults: false },
    format: { spidermonkey: true },
  });

  const languages = ast.body.filter(o => (
    o.type == "VariableDeclaration" &&
    o.declarations[0].id.type == "Identifier" &&
    o.declarations[0].id.name == "languages" &&
    o.declarations[0].init.type == "ArrayExpression"
  ))[0].declarations[0].init.elements;

  const keepLanguages = languages.filter(o => (
    o.type == "CallExpression" &&
    o.callee.type == "MemberExpression" &&
    o.callee.object.type == "Identifier" &&
    o.callee.object.name == "LanguageDescription" &&
    o.callee.property.type == "Identifier" &&
    o.callee.property.name == "of" &&
    o.arguments[0]?.properties?.some(p => (
      p.type == "Property" &&
      p.key.type == "Identifier" &&
      (
        p.key.name == "extensions" &&
        p.value.type == "ArrayExpression" &&
        p.value.elements.some(e => (
          e.type == "Literal" &&
          keep.extensions.includes(e.value)
        ))
      ) || (
        p.key.name == "filename" &&
        p.value.type == "Literal" &&
        keep.filenames.some(r_or_s => r_or_s == p.value.value || (
          r_or_s.source == p.value.regex?.pattern &&
          r_or_s.flags == p.value.regex?.flags
        ))
      ) || (
        p.key.name == "name" &&
        p.value.type == "Literal" &&
        keep.names.includes(p.value.value)
      )
    ))
  ));

  languages.splice(0);
  languages.push(...keepLanguages);

  if (debug) {
    await fs.writeFile("ast.json", JSON.stringify(ast, null, 2));
  }

  const { code } = await terser.minify([
    ast,
  ], {
    compress: { defaults: false },
    parse: { spidermonkey: true },
  });

  return code;
}


await build();
