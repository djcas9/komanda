define([
  "backbone-plugins",
  "helpers"
], function(Backbone, Helpers) {

  var Settings = Backbone.NestedModel.extend({
    localStorage: new Backbone.LocalStorage("komanda.settings"),
    store: "settings",

    defaults: {
      themes: {
        base: "komanda-base.css",
        current: "komanda-dark",
        list: {
          "komanda-dark": {
            name: "Komanda Dark",
            css: "themes/komanda-dark/komanda-dark.css"
          },
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
      display: {
        timestamp: "MM/DD/YY hh:mm:ss"
      }
    },

    initialize: function() {
      this.bind("change", function(a, b) {
        if (Komanda.settings) Komanda.settings.save(null);

        if (a.changed.hasOwnProperty("themes")) Helpers.loadTheme(a.attributes);
      });
    }
  });

  return Settings;
});
