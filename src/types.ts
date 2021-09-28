
export type Extracti18nOptions = {
  defaultLanguage?:string,
  outputFormat?: OutputFormat,
  translationsFolder?:string,
  languages?:string[],
  src?:string,
}

export type Compilei18nOptions = {
  language: string,
  translationsFolder?: string,
  outputFormat?: OutputFormat
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

export type TranslationTag = { id: string, text?: string, start: number, end:number, name: string, path: string };

export type IdKeys = {
    id: string,
    dataKeys: string[]
}