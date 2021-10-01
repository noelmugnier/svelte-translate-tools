<script lang="ts">
	import {
	  i18n,
	  i18nFormat,
	  def,
	  PreTranslatedApp,
	  i18nStore,
	  getLocaleFromNavigator
	} from "svelte-translate";
	
	
	import enGB from './../public/lang/en-GB.json';
	import frFR from './../public/lang/fr-FR.json';
 
	let count = 0; 

	i18nStore.addTranslations("en-GB", enGB);
	i18nStore.addTranslations("fr-FR", frFR);
</script>

<PreTranslatedApp>
	<p use:i18n={def("app.title",{count, strong: chunks => `<strong>${chunks}</strong>`}, "Corresponding to App.svelte's title")}>
		This is my <strong>default title</strong> with 
		{`{count, plural, =0{no results} one{one result} other{# results}}`}
	</p> 
	<i use:i18n={"definition"}>This is my default definition</i>
	<br/> 
	<br/> 
	<button use:i18n={def("increase", {count})} on:click={() => count++}>
		Increase {count}
	</button>
</PreTranslatedApp>