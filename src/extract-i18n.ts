const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const {parse} = require('svelte/compiler');
const lodash = require('lodash');
const xliff = require('xliff');
import type { Attribute, TemplateNode } from "svelte/types/compiler/interfaces";

import type { Extracti18nOptions, IdKeys, OutputFormat, Translation } from "./types";

export const extracti18n = async (options?: Extracti18nOptions) : Promise<any> => {
  if (!options)
    options = {};
  
  options.defaultLanguage = options.defaultLanguage || 'en';
  options.outputFormat = options.outputFormat || 'xlf';
  options.translationsFolder = path.resolve(options.translationsFolder || './src/lang');
  options.languages = options.languages ? options.languages : [];
  options.src = path.resolve(options.src || './src');

  if (options.languages.length < 1)
    return;

  await executeExtraction(options);
}

/**
 * This will process .svelte files to extract html tag (with use:i18n action) content to a dedicated json file.
 */
const executeExtraction = async (options: Extracti18nOptions) : Promise<any> => {   
  console.log(`\nExtracted messages languages: ${options.languages} will be located in ${options.translationsFolder} folder as messages.xx.${options.outputFormat} with default language app set to ${options.defaultLanguage}.\n`);

  // get all .svelte files
  glob(path.join(options.src, "**/*.svelte"), null, async (err: any, files: string[]) => {
    if (err) {
      throw err;
    }

    if (!files || files.length < 1) {
      return;
    }

    let translations = await Promise.all(files.map((filePath: string) => extractComponentTranslations(path.resolve(filePath))));
    const { sources, targets } = initSourcesAndTargetsTranslations(translations[0]);
    
    await writeLanguagesTranslations(options.defaultLanguage, options.languages, sources, targets, options.translationsFolder, options.outputFormat);
  });
}

/**
 * Processes .svelte file and parse AST tree to find node with attribute use:i18n and extract its text value.
 */
const extractComponentTranslations = async (filePath: string) : Promise<Translation[]> => {
  try {
    const srcCode = await fs.readFile(filePath, { encoding: "utf-8" });    
    let newContent = srcCode;
    let scriptMatched = /(?<script>.*\<script.*\<\/script\>)/gs.exec(srcCode);
    if (scriptMatched && scriptMatched.groups.script) {
      newContent = srcCode.replace(scriptMatched.groups.script, '');
    }

    let document = parse(newContent);
    return extractTranslationsFromAstNode(document.html, filePath);
  }
  catch (e) {
    console.error(e);
  }
}

const initSourcesAndTargetsTranslations = (translations: any) : {sources:Record<string, string>, targets:Record<string, string>} => {
    let sources : Record<string, string> = {};
    let targets : Record<string, string> = {};
    let groupedTranslations = lodash.groupBy(translations, t => t.id);

    let errors = [];
    Object.keys(groupedTranslations).forEach(key => {
      if (groupedTranslations[key].length > 1) {
        errors = [...errors, `\n\nMultiple translation found for id "${key}":`];
        groupedTranslations[key].forEach(t => {
          errors = [...errors, `\n${getComponentNameFromPath(t.path)} with tag <${t.tag}> on in file ${t.componentPath}:${t.line}`];
        })
      }
      
      sources[key] = groupedTranslations[key][0].text;
      targets[key] = "";
    });
    
    if (errors && errors.length)
      throw `Error(s) occured while extracting translations from svelte components: ${errors}\n`;
  
  return { sources, targets };
}

const getComponentNameFromPath = (filePath: string): string => {  
  let paths = filePath.split('/');
  return paths[paths.length - 1];
}

const extractTranslationsFromAstNode = (node: TemplateNode, componentPath: string) : Translation[] => {
  let translations: Translation[] = [];
  node.children.forEach(childNode => {
    try {
      let i18nAttr = childNode.attributes ? childNode.attributes.find(a => a.name === "i18n" && a.type === "Action") : null;
      if (i18nAttr) {        
        let { id, dataKeys } = getIdAndObjectKeysFromAttribute(i18nAttr);        
        let content = getNodeContent(childNode);        
        validateContentBindings(content, dataKeys);
        translations = [...translations, { id: id, text: content, line: childNode.start, tag: childNode.name, path: componentPath }];     
      }
      else if (childNode.children && childNode.children.length){      
        translations = [...translations, ...extractTranslationsFromAstNode(childNode, componentPath)];
      }
    }
    catch (e) {
      console.error(e, ` on tag <${childNode.name}> at position: ${childNode.start} in component ${componentPath}.`);
    }
  });
  
  return translations;
}

const getIdAndObjectKeysFromAttribute = (attr: Attribute) => {
  let expression = attr.expression;
  switch (expression.type)
  {
    case "CallExpression":
      return getIdFromCallExpression(expression);
    case "ObjectExpression":
      return getIdFromObjectExpression(expression);
    case "Literal":
      return getIdFromLiteralExpression(expression);
    default:
      return { id: null, dataKeys: null };
  }
}

const getIdFromCallExpression = (expression: { callee: { name: string; }; arguments: any[]; }) : IdKeys => {
  if (expression.callee.name !== "def")
    throw `You must use def function with use:i18n`;
        
  let idProperty = expression.arguments.find(a => a.type === "Literal");
  let id = idProperty ? idProperty.value : "";
  let dataKeys = [];

  let dataProperty = expression.arguments.find(a => a.type === "ObjectExpression");
  if (dataProperty) {
    if (dataProperty.type !== "ObjectExpression") {
      throw `You must specify data as object when using use:i18n={def("", {})}`;
    }

    dataKeys = dataProperty.properties.map(p => p.key.name);
  }
  
  if (!id)
    throw 'Id not found on use:i18n attribute';
  
  return { id, dataKeys };
}

const getIdFromObjectExpression = (expression: { properties: any[]; }): IdKeys => {
  let idProperty = expression.properties.find(p => p.key.name === "id");
  if (!idProperty) {
    throw `You must specify id when using use:i18n={{id:""}}`;
  }
  
  let id = idProperty.value.value;
  let dataKeys = [];

  let dataProperty = expression.properties.find(p => p.key.name === "data");
  if (dataProperty) {
    if (dataProperty.value.type !== "ObjectExpression") {
      throw `You must specify data as object when using use:i18n={{id:"", data:{}}}`;
    }

    dataKeys = dataProperty.value.properties.map(p => p.key.name);
  }
  
  if (!id)
    throw 'Id not found on use:i18n attribute';

  return { id, dataKeys };
}

const getIdFromLiteralExpression = (expression: { value: string }): IdKeys => {
  if(!expression.value || expression.value.length < 1)
    throw 'Id not found on use:i18n attribute';
  
  return { id: expression.value, dataKeys: [] };
}

const getNodeContent = (childNode: TemplateNode): string => {
  if (childNode.children.length < 1) {
    throw `Tag <${childNode.name}> don't have content.`;
  }

  if(childNode.children.filter(c => c.type !== "Text" && c.type !== "Element" && c.type !== "MustacheTag").length > 0){
    throw `Tag <${childNode.name}> can only have text, element or simple mustache binding like {xxxx}`;
  }

  let childNodes = childNode.children.filter(c => c.type === "Text" || c.type === "Element" || c.type === "MustacheTag");      
  let content = "";

  childNodes.forEach(node => {
    content += getContentFromNodeType(node);
  });
  
  content = content.replace(/\n/g, '').replace(/\t/g, '');
  return content;
}

const getContentFromNodeType = (node: TemplateNode) : string => {
  let content = "";
  switch (node.type) {
    case "Text":
      content += getTextContent(node);
      break;
    case "Element":
      content += getElementContent(node);
      break;
    case "MustacheTag":
      content += getMustacheTagContent(node);
      break;
  }

  return content;
}

const getTextContent = (text: TemplateNode): string => {
  return text.data;
}

const getMustacheTagContent = (mustache: TemplateNode): string => {
  let content = "";
  if (mustache.expression.type === "Identifier")
    content += `{${mustache.expression.name}}`;
  else if (mustache.expression.type === "Literal") {
    content += mustache.expression.value;
  }
  else if (mustache.expression.type === "TemplateLiteral") {
    let quasis = "";
    mustache.expression.quasis.filter(q => q.type === "TemplateElement").forEach(q => {
      quasis += q.value.raw;
    });

    content += quasis;
  }

  return content;
}

const getElementContent = (element: TemplateNode) : string => {
  if (element.name === "br") {
    return `<${element.name}/>`;
  }

  let content = `<${element.name}>`;

  element.children.forEach(child => {
    content += getContentFromNodeType(child);
  });

  content += `</${element.name}>`;
  return content;
}

const validateContentBindings = (content: string, dataKeys: string[]):void => {
  if (!dataKeys)
    return;
  
  dataKeys.forEach(dk => {
      if (content.indexOf(dk) < 0)
        throw `Binding ${dk} was not found`;
    });
}

const writeLanguagesTranslations = async (defaultLanguage: string, languages: string[], sourcesTranslations: Record<string, string>, initialTargetTranslations:Record<string, string>, translationsFolder:string, outputFormat: OutputFormat) : Promise<any> => {
  languages.forEach(async language => {
    if (defaultLanguage === language)
      return;
    
    const targetTranslations = await updateExistingTargetTranslations(defaultLanguage, language, sourcesTranslations, initialTargetTranslations, translationsFolder, outputFormat);

    let res = null;
      switch (outputFormat)
      {
        case "xlf":
          res = await xliff.createxliff12(defaultLanguage, language, sourcesTranslations, targetTranslations, "svelte-translate");
          break;
        case "json":
          res = JSON.stringify(await xliff.createjs(defaultLanguage, language, sourcesTranslations, targetTranslations, "svelte-translate"), null, 2);        
          break;
      }

      let folder = `${translationsFolder}`;
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }

      await fs.writeFile(`${folder}/messages.${language}.${outputFormat}`, res, 'utf-8');
    });
}

const updateExistingTargetTranslations = async (defaultLanguage:string, language:string, sourcesTranslations:Record<string, string>, initialTargetTranslations:Record<string, string>, translationsFolder:string, outputFormat:OutputFormat) : Promise<Record<string, string>> => {
  if (language === defaultLanguage) {
    return { ...sourcesTranslations };
  }
  
  let updatedTargets = { ...initialTargetTranslations };
  let file = `${translationsFolder}/messages.${language}.${outputFormat}`;
  if (!fs.existsSync(file)) {
    return updatedTargets;
  }

  let res = null;
  const targetTranslationFile = await fs.readFile(file, { encoding: "utf-8" });
  switch (outputFormat)
  {
    case "xlf":
      res = await xliff.xliff12ToJs(targetTranslationFile);
      break;
    case "json":
      res = JSON.parse(targetTranslationFile);
      break;
  }
  
  const existingTranslations = res.resources["svelte-translate"];
  Object.keys(updatedTargets).forEach(key => {
    let existingTranslation = existingTranslations[key];
    if (existingTranslation && existingTranslation.target && existingTranslation.target.length > 0)
      updatedTargets[key] = existingTranslation.target;    
  });

  return updatedTargets;
}
