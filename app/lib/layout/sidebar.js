define([
  "marionette", 
  "hbs!templates/layout/sidebar",
  "helpers",
  'hbs!templates/settings/add-server',
  'hbs!templates/settings/index',
  'hbs!templates/settings/about'
], function(Marionette, template, Helpers, AddServerView, SettingsIndexView, AboutView) {

  return Marionette.ItemView.extend({
    el: "#sidebar",
    template: template,

    events: {
      "click #master-control .add-server": "addServer",
      "click #master-control .settings": "settings",
      "click #master-control .about": "about"
    },

    initialize: function() {
    },

    addServer: function(e) {
      e.preventDefault();
      var box = Helpers.limp.box(AddServerView, {}, {});
      box.open();
    },

    settings: function(e) {
      e.preventDefault();
      var box = Helpers.limp.box(SettingsIndexView, {}, {});
      box.open();
    },

    about: function(e) {
      e.preventDefault();
      var box = Helpers.limp.box(AboutView, {}, {});
      box.open();
    }

  });

});
