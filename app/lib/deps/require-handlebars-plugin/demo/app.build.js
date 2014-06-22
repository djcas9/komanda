({
    appDir: "./",
    baseUrl: "./",
    dir: "../demo-build",

    optimizeCss: "standard",
    // optimize: "none",
    // inlining ftw
    inlineText: true,

    pragmasOnSave: {
        //removes Handlebars.Parser code (used to compile template strings) set
        //it to `false` if you need to parse template strings even after build
        excludeHbsParser : true,
        // kills the entire plugin set once it's built.
        excludeHbs: true,
        // removes i18n precompiler, handlebars and json2
        excludeAfterBuild: true
    },

    paths: {
      "hbs": "../hbs",
      "Handlebars" : "../Handlebars",
      "underscore" : "../hbs/underscore",
      "i18nprecompile" : "../hbs/i18nprecompile",
      "json2" : "../hbs/json2"
      // if your project is already using underscore.js and you want to keep
      // the hbs plugin even after build (excludeHbs:false) you should set the
      // "hbs/underscore" path to point to the shared location like
      // "hbs/underscore" : "lib/underscore" to avoid loading it twice
    },

    locale: "en_ca",

    // default plugin settings, listing here just as a reference
    hbs : {
        templateExtension : 'hbs',
        // if disableI18n is `true` it won't load locales and the i18n helper
        // won't work as well.
        disableI18n : false
    },

    modules: [
        {
            name: "main"
        }
    ]
})
