const fs = require("fs-extra");
const xliff = require('xliff');

import type { Attribute } from "svelte/types/compiler/interfaces";

import type { IdKeys, OutputFormat } from "./types";

export const getIdAndObjectKeysFromAttribute = (attr: Attribute) : IdKeys => {
  const expression = attr.expression;
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

export const getIdFromCallExpression = (expression: { callee: { name: string; }; arguments: any[]; }) : IdKeys => {
  if (expression.callee.name !== "def")
    throw `You must use def function with use:i18n`;
        
  const idProperty = expression.arguments.find(a => a.type === "Literal");
  const id = idProperty ? idProperty.value : "";
  let dataKeys = [];

  const dataProperty = expression.arguments.find(a => a.type === "ObjectExpression");
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

export const getIdFromObjectExpression = (expression: { properties: any[]; }): IdKeys => {
  const idProperty = expression.properties.find(p => p.key.name === "id");
  if (!idProperty) {
    throw `You must specify id when using use:i18n={{id:""}}`;
  }
  
  const id = idProperty.value.value;
  let dataKeys = [];

  const dataProperty = expression.properties.find(p => p.key.name === "data");
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

export const getIdFromLiteralExpression = (expression: { value: string }): IdKeys => {
  if(!expression.value || expression.value.length < 1)
    throw 'Id not found on use:i18n attribute';
  
  return { id: expression.value, dataKeys: [] };
}

export const loadTranslatedMessages = async (path: string, outputFormat: OutputFormat): Promise<any> => { 
  const srcCode = await fs.readFile(path, { encoding: "utf-8" });
  
  switch (outputFormat)
    {
      case "xlf":
        return await xliff.xliff12ToJs(srcCode);
      case "json":
        return JSON.parse(srcCode);
  }
}