define([
  "backbone-plugins",
  "helpers"
], function(Backbone, Helpers) {

  var Settings = Backbone.NestedModel.extend({
    localStorage: new Backbone.LocalStorage('komanda.settings'),
    store : 'settings',

    defaults: {
      themes: {
        base: "komanda-base.css",
        current: "komanda-dark",
        list: {
          "komanda-dark": {
            name: "Komanda Dark",
            css: "themes/komanda-dark/komanda-dark.css"
          },
          // "komanda-light": {
            // name: "Komanda Light",
            // css: "themes/komanda-light/komanda-light.css"
          // },
          "komanda-octa": {
            name: "Komanda Octa",
            css: "themes/komanda-octa/komanda-octa.css"
          }

        }
      },
      notifications: {
        highlight: true,
        pm: true,
        status: true,
        badge: true
      },
      embed: {
        all: false,
        gist: false,
        jsfiddle: false,
        images: true
      }
    },

    initialize: function() {
      this.bind('change', function(a, b) {
        if (Komanda.settings) Komanda.settings.save(null);

        if (a.changed.hasOwnProperty(('themes'))) Helpers.loadTheme(a.attributes);
      });
    }
  });

  return Settings;
});
