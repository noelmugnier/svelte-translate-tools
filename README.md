
# Svelte Translate Tool (inspired by angular i18n and svelte-i18n)

Translation tools to extract/generate/compile translation files for your Svelte App (must be used with the package [svelte-translate](https://github.com/noelmugnier/svelte-translate)) at build time.

# Installation

```node
npm install svelte-translate-tools -D
```

# Dynamic translations usages

```js
plugins: [
		extracti18n({languages:['en-GB','fr-FR'], defaultLanguage:'en-GB'}),
		generatei18n(),,
		svelte({
			preprocess: [	
				sveltePreprocess({ sourceMap: !production })	
			],
			...
		}),
		...
]
```

# Precompiled translations usages

```js
plugins: [
		extracti18n({languages:['en-GB','fr-FR'], defaultLanguage:'en-GB'}),
		generatei18n(),,
		svelte({
			preprocess: [	
				preprocess_compilei18n({language:"fr-FR"}),
				sveltePreprocess({ sourceMap: !production })	
			],
			...
		}),
		...
]
```
then replace your

```html
<DynamicTranslatedApp>	
</DynamicTranslatedApp>
```

with

```html
<PreTranslatedApp>	
</PreTranslatedApp>
```

# TODO

* [ ] support context/description in def() helper in order to extract them and complete xlf files require a fork on xliff library to use custom attributes
