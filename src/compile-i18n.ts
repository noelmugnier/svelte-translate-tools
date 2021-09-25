import type { Compilei18nOptions } from "./types";
import {parse} from "svelte/compiler";

export const compilei18n = (options?:Compilei18nOptions): Readonly<{
        markup?: any;
        style?: any;
        script?: any;
}> => {
    if (!options)
        options = {};
    
    options.languages = options.languages || [];
    return {
        markup({ content, filename }) {
            if (filename.indexOf('src/') > -1) {
                let newContent = content;
                let scriptMatched = /(?<script>.*\<script.*\<\/script\>)/gs.exec(content);
                if (scriptMatched && scriptMatched.groups.script) {
                    newContent = content.replace(scriptMatched.groups.script, '');
                }

                let result = parse(newContent);
                console.log(result.html);
                return { code: content };
            }
        }
    };
}