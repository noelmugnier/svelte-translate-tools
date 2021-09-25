
# Svelte Translate Tool (inspired by angular i18n and svelte-i18n)

Translation tools to extract/generate/compile translation files for your Svelte App (must be used with the package [svelte-translate](https://github.com/noelmugnier/svelte-translate)) at build time.

# Usages

```js
plugins: [
		extracti18n({languages:['en-GB','fr-FR'], defaultLanguage:'en-GB'}),
		generatei18n(),,
		svelte({
			preprocess: [			
				preprocess_compilei18n(),
				sveltePreprocess({ sourceMap: !production })	
			],
			...
		}),
		...
]
```

# TODO

* [ ] create svelte preprocessor plugin to replace component tag with i18n id corresponding translation found from translation file (at compile time)
* [ ] support context/description in def() helper in order to extract them and complete xlf files require a fork on xliff library to use custom attributes
