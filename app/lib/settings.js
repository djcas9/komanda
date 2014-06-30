define([
  "backbone-plugins",
  "helpers"
], function(Backbone, Helpers) {

  var Settings = Backbone.NestedModel.extend({
    localStorage: new Backbone.LocalStorage("komanda.settings"),
    store: "settings",
    plugins: [],

    defaults: {
      themes: {
        base: "komanda-base.css",
        current: "komanda-dark",
        list: {
          "komanda-dark": {
            name: "Komanda",
            css: "themes/komanda-dark/komanda-dark.css"
          },
          "komanda-light": {
            name: "Komanda Light",
            css: "themes/komanda-light/komanda-light.css"
          },
          "octa": {
            name: "Octa",
            css: "themes/octa/octa.css"
          },
          "pitch-black": {
            name: "Pitch Black",
            css: "themes/pitch-black/pitch-black.css"
          }
        }
      },
      plugins: {
        github: true
      },
      notifications: {
        highlight: true,
        pm: true,
        status: true,
        badge: true
      },
      display: {
        timestamp: "MM/DD/YY hh:mm:ss"
      },
      sounds: {
        chat: false,
        pm: true,
        hightlight: true
      }
    },

    modelEvents: {
      "sync": "save"
    },

    initialize: function() {
      this.bind("change", function(a, b) {
        // Komanda.settings.set("themes", a.attributes.themes);
        // Komanda.settings.save(null);

        if (a.changed.hasOwnProperty("themes")) Helpers.loadTheme(a.attributes);
      });
    },

    addPlugin: function(plugin) {
      this.plugins.push(plugin);
    }
  });

  return Settings;
});
