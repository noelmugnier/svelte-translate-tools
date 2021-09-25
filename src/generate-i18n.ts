const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const xliff = require('xliff');
const minimist = require('minimist');
import type { Generatei18nOptions, LanguageTranslations, OutputFormat } from "./types";

export const generatei18n = async (options?: Generatei18nOptions):Promise<any> => {
  if (!options)
    options = {};
  
  options.outputFormat = options.outputFormat || 'xlf';
  options.translationsFolder = path.resolve(options.translationsFolder || './src/lang');
  options.destinationFolder = path.resolve(options.destinationFolder || './public/lang');

  await executeGeneration(options);
}

export const node_process = async (): Promise<any> =>  {
  let args = minimist(process.argv.slice(2));
  let outputFormat = args.o || 'xlf';
  let translationsFolder = path.resolve(args.f || './src/lang');
  let destinationFolder = path.resolve(args.d || './public/lang');

  await executeGeneration({ outputFormat, translationsFolder, destinationFolder });
}

/**
 * This will process .json/.xlf files to convert it to a keyvalue json object in destinationFolder.
 */
const executeGeneration = async (options) : Promise<any> => {
  console.log(`\nParsing messages files with format ${options.outputFormat} located in folder ${options.translationsFolder} folder and writting output in ${options.destinationFolder} folder.\n`);

  // get all .xlf/.json translation files
  glob(path.join(`${options.translationsFolder}`, `**/messages.*.${options.outputFormat}`), null, async (err: any, files: string[]) => {
    if (err) {
      throw err;
    }

    if(!files || files.length < 1)
    {
      return;
    }

    let languagesTranslations: any = await Promise.all(files.map((filePath: string) => compileToTranslationFile(path.resolve(filePath), options.outputFormat)));

    //generate default language translation file
    let defaultTranslations = await compileToTranslationFile(path.resolve(files[0]), options.outputFormat, "source");
    languagesTranslations = [...languagesTranslations, defaultTranslations];

    //generate file for each language
    let folder = `${options.destinationFolder}`;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }
    
    languagesTranslations.forEach(async lt => {
      await fs.writeFile(path.join(`${options.destinationFolder}/${lt.language}.json`), JSON.stringify(lt.translations, null, 2));
    })
  });
}

/**
 * Processes .xlf/.json file to generate a dedicated xx-XX.json translation file.
 */
const compileToTranslationFile = async (filePath: string, outputFormat: OutputFormat, objProperty: "source" | "target" = "target"): Promise<LanguageTranslations> => {
  const srcCode = await fs.readFile(filePath, { encoding: "utf-8" });

  let res = null;
  switch (outputFormat)
    {
      case "xlf":
        res = await xliff.xliff12ToJs(srcCode);
        break;
      case "json":
        res = JSON.parse(srcCode);
        break;
  }

  let results = {};
  const existingTranslations = res.resources["svelte-translate"];
  Object.keys(existingTranslations).forEach(key => {
    let existingTranslation = existingTranslations[key];
    if (existingTranslation && existingTranslation[objProperty] && existingTranslation[objProperty].length > 0)
      results[key] = existingTranslation[objProperty];    
  });

  return { language: (objProperty === "target" ? res.targetLanguage : res.sourceLanguage), translations: results };
}