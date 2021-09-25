
export type Extracti18nOptions = {
  defaultLanguage?:string,
  outputFormat?: OutputFormat,
  translationsFolder?:string,
  languages?:string[],
  src?:string,
}

export type Compilei18nOptions = {
  languages?:string[],
}

export type OutputFormat = 'xlf' | 'json';

export type Generatei18nOptions = {
  outputFormat?: OutputFormat,
  translationsFolder?: string,
  destinationFolder?: string,
}

export type LanguageTranslations = {
    language: string,
    translations: Record<string, string>
}

export type Translation = { id: string, text: string, line: number, tag: string, path: string };

export type IdKeys = {
    id: string,
    dataKeys: string[]
}