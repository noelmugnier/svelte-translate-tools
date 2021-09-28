const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");

import { loadTranslatedMessages } from "./helpers";
import type { Generatei18nOptions, LanguageTranslations, OutputFormat } from "./types";

export const generatei18n = async (options?: Generatei18nOptions):Promise<any> => {
  if (!options)
    options = {};
  
  options.outputFormat = options.outputFormat || 'xlf';
  options.translationsFolder = path.resolve(options.translationsFolder || './src/lang');
  options.destinationFolder = path.resolve(options.destinationFolder || './public/lang');

  await executeGeneration(options);
}

/**
 * This will process .json/.xlf files to convert it to a keyvalue json object in destinationFolder.
 */
const executeGeneration = async (options : Generatei18nOptions) : Promise<any> => {
  console.log(`\nParsing messages files with format ${options.outputFormat} located in folder ${options.translationsFolder} folder and writting output in ${options.destinationFolder} folder.\n`);

  // get all .xlf/.json translation files
  glob(path.join(`${options.translationsFolder}`, `**/messages.*.${options.outputFormat}`), null, async (err: any, files: string[]) => {
    if (err) {
      throw err;
    }

    if(!files || files.length < 1)
    {
      console.log('No translation files found.');
      return;
    }

    let languagesTranslations: any = await Promise.all(files.map((filePath: string) => compileToTranslationFile(path.resolve(filePath), options.outputFormat)));

    //generate default language translation file
    const defaultTranslations = await compileToTranslationFile(path.resolve(files[0]), options.outputFormat, "source");
    languagesTranslations = [...languagesTranslations, defaultTranslations];

    //generate file for each language
    await writeTranslationsFiles(languagesTranslations, options);
  });
}

const writeTranslationsFiles = async(languagesTranslations, options : Generatei18nOptions) => {
  const folder = `${options.destinationFolder}`;
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
    
  languagesTranslations.forEach(async (lt: { language: any; translations: any; }) => {
    await fs.writeFile(path.join(`${options.destinationFolder}/${lt.language}.json`), JSON.stringify(lt.translations, null, 2));
  });
}

/**
 * Processes .xlf/.json file to generate a dedicated xx-XX.json translation object.
 */
const compileToTranslationFile = async (filePath: string, outputFormat: OutputFormat, sourceOrTarget: "source" | "target" = "target"): Promise<LanguageTranslations> => {
  const translatedMessages = await loadTranslatedMessages(filePath, outputFormat);
  const existingTranslations = translatedMessages.resources["svelte-translate"];

  const results = {};
  Object.keys(existingTranslations).forEach(key => {
    const existingTranslation = existingTranslations[key];
    results[key] = getLanguageTranslation(existingTranslation, sourceOrTarget);
  });

  return { language: (sourceOrTarget === "target" ? translatedMessages.targetLanguage : translatedMessages.sourceLanguage), translations: results };
}

const getLanguageTranslation = (existingTranslation: Record<string, string>, sourceOrTarget: "source" | "target" = "target") => {  
  if (!existingTranslation || !existingTranslation[sourceOrTarget] || existingTranslation[sourceOrTarget].length < 1) {
    return "";
  }
  
  let sourceOrTargetTranslation = existingTranslation[sourceOrTarget];
  sourceOrTargetTranslation = sourceOrTargetTranslation.replace(/\n/g, '').replace(/\t/g, '');
      
  let matched = /(?<start>\{\s*`).*(?<end>`\s*\})/gms.exec(sourceOrTargetTranslation);
  if (matched && matched.groups.start) {
    return sourceOrTargetTranslation.replace(matched.groups.start, '').replace(matched.groups.end, '');
  }

  return sourceOrTargetTranslation;
}