const fs = require("fs-extra");
const path = require("path");

import { parse } from "svelte/compiler";
import type { TemplateNode } from "svelte/types/compiler/interfaces";

import { getIdAndObjectKeysFromAttribute, loadTranslatedMessages } from "./helpers";
import type { Compilei18nOptions, TranslationTag } from "./types";

const translations = {};

export const compilei18n = (options:Compilei18nOptions): Readonly<{
        markup?: any;
        style?: any;
        script?: any;
}> => {
    
    options.translationsFolder = path.resolve(options.translationsFolder || './src/lang');
    options.outputFormat = options.outputFormat || 'xlf';
  
    if (!fs.existsSync(options.translationsFolder)) {
        throw `Folder ${options.translationsFolder} does not exists.`;
    }
  
    let file = `${options.translationsFolder}/messages.${options.language}.${options.outputFormat}`;
    if (!fs.existsSync(file)) {
        throw `${file} does not exists.`;
    }  
    
    return {
      markup: async ({ content, filename }) => {   
        let languageTranslations = translations[options.language];
        if (!languageTranslations) {
          languageTranslations = await loadTranslatedMessages(file, options.outputFormat);
          translations[options.language] = languageTranslations;           
        }
        
        const existingTranslations = languageTranslations.resources["svelte-translate"];
        
        if (filename.indexOf('src/') > -1) {
            let newContent = content;
            const scriptMatched = /(?<script>.*\<script.*\<\/script\>)/gs.exec(content);
            if (scriptMatched && scriptMatched.groups.script) {
                newContent = content.replace(scriptMatched.groups.script, '<!--SCRIPTS-->');
            }

            const document = parse(newContent);
            const tags = extractTagsToReplaceFromAstNode(document.html, filename);

            tags.forEach(t => {
              const translation = existingTranslations[t.id];
              if (translation) {
                newContent = newContent.replace(translation.source, translation.target);
              }
            });
          
           if (scriptMatched && scriptMatched.groups.script) {
            newContent = newContent.replace('<!--SCRIPTS-->', scriptMatched.groups.script);
           }
          
          //TODO must improve this process to be able to just remove the i18n attribute if not required instead of testing in i18nFormat
          newContent = newContent.replace('use:i18n=', 'use:i18nFormat=');
          
          const preCompiledAppMatched = /\<PreTranslatedApp\s*(compiledLanguage\s*=\s*"(?<language>[A-z\-]*)")?\s*\>/.exec(newContent);
          if (preCompiledAppMatched) {
            newContent = newContent.replace(preCompiledAppMatched[0], `<PreTranslatedApp compiledLanguage="${languageTranslations.targetLanguage}">`);              
          }
          
          return { code: newContent };
        }
    }
  };
}

const extractTagsToReplaceFromAstNode = (node: TemplateNode, componentPath: string) : TranslationTag[] => {
  let tags: TranslationTag[] = [];
  node.children.forEach(childNode => {
    try {
      let i18nAttr = childNode.attributes ? childNode.attributes.find(a => a.name === "i18n" && a.type === "Action") : null;
      if (i18nAttr) {        
          const { id } = getIdAndObjectKeysFromAttribute(i18nAttr);
          tags = [...tags, { id, end: childNode.end, start: childNode.start, path: componentPath, name: childNode.name}];             
      }
      else if (childNode.children && childNode.children.length){      
        tags = [...tags, ...extractTagsToReplaceFromAstNode(childNode, componentPath)];
      }
    }
    catch (e) {
      console.error(e, ` on tag <${childNode.name}> at position: ${childNode.start} in component ${componentPath}.`);
    }
  });
  
  return tags;
}