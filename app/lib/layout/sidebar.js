define([
  "marionette", 
  "hbs!templates/layout/sidebar",
  "helpers",
  'hbs!templates/settings/add-server',
  'hbs!templates/settings/index',
  'hbs!templates/settings/about',
  "lib/sessions/session",
  "lib/sessions/session-edit-view"
], function(Marionette, template, Helpers, AddServerView, SettingsIndexView, AboutView, Session, SessionEditView) {

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

      var session = new Session();

      var view = new SessionEditView({
        model: session
      });

      var box = Helpers.limp.box(AddServerView, {}, {
        afterOpen: function(limp, html) {
          console.log(limp, html);
          var region = new Marionette.Region({
            el: '.komanda-box-content'
          });

          region.show(view);
        },
        onAction: function() {
          view.saveSession();
        }
      });
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
