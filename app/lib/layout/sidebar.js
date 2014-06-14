define([
  "underscore",
  "marionette", 
  "hbs!templates/layout/sidebar",
  "helpers",
  'hbs!templates/settings/add-server',
  'hbs!templates/settings/edit-server',
  'hbs!templates/settings/index',
  'hbs!templates/settings/about',
  "lib/sessions/session",
  "lib/sessions/session-edit-view"
], function(_, Marionette, template, Helpers, AddServerView, EditServerView, SettingsIndexView, AboutView, Session, SessionEditView) {

  return Marionette.ItemView.extend({
    el: "#sidebar",
    template: template,

    events: {
      "click #master-control .add-server": "addServer",
      "click #master-control .settings": "settings",
      "click #master-control .about": "about",
      "click i.edit-session-data": "editServer"
    },

    initialize: function() {
    },

    editServer: function(e) {
      e.stopPropagation();
      e.stopImmediatePropagation();

      var uuid = $(e.currentTarget).attr('data-uuid');

      var session = Komanda.sessions.get(uuid);

      var view = new SessionEditView({
        model: session
      });

      var region = new Marionette.Region({
        el: '.komanda-box-content'
      });

      var box = Helpers.limp.box(EditServerView, {
        edit: true,
        session: session
      }, {
        afterOpen: function(limp, html) {
          Komanda.sessions.fetch();

          region.show(view);

          html.on('click', 'button.destroy-session', function(e) {
            e.preventDefault();
            view.destroySession();
          });

          html.on('click', 'button.connect-session', function(e) {
            e.preventDefault();
            if (Komanda.connections.hasOwnProperty(uuid)) {
              var connect = Komanda.connections[uuid];
              connect.start(function(client) {
                _.each(session.get('channels'), function(c) {
                  Komanda.vent.trigger(uuid + ":join", c);
                });
              });

              $.limpClose();
            };
          });

        },
        onAction: function() {
          view.editSession();
        },
        onClose: function() {
          view.close();
        }
      });
      box.open();
    },

    addServer: function(e) {
      e.preventDefault();

      var session = new Session();

      var view = new SessionEditView({
        model: session
      });

      var box = Helpers.limp.box(AddServerView, {
        edit: false
      }, {
        afterOpen: function(limp, html) {
          var region = new Marionette.Region({
            el: '.komanda-box-content'
          });

          region.show(view);
        },
        onAction: function() {
          view.saveSession();
        },
        onClose: function() {
          view.close();
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
