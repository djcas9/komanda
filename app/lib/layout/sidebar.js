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
  "lib/sessions/session-edit-view",
  "lib/settings",
  "lib/settings-view"
], function(_, Marionette, template, Helpers, AddServerView, EditServerView, 
            SettingsIndexView, AboutView, Session, SessionEditView, Settings, SettingsEditView) {

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
      e.preventDefault();

      var uuid = $(e.currentTarget).attr('data-uuid');
      var session = Komanda.sessions.get(uuid);

      var view = null;
      var region = null;

      var connected = session.get('connectionOpen');

      var box = Helpers.limp.box(EditServerView, {
        session: session,
        connected: connected,
        name: session.get('server')
      }, {
        onOpen: function() {
          view = new SessionEditView({
            model: session
          });

          region = new Marionette.Region({
            el: '.komanda-box-content'
          });
        },
        afterOpen: function(limp, html) {
          region.show(view);

          html.on('click', 'button.destroy-session', function(e) {
            e.preventDefault();
            view.destroySession();
          });

          html.on('click', 'button.disconnect-session', function(e) {
            e.preventDefault();

            Komanda.vent.trigger(uuid + ':disconnect');

            $('.channel[data-server-id="'+uuid+'"] .messages').html();
            $('li.channel-item[data-server-id="'+uuid+'"]').each(function() {
              var i = $(this);
              if (i.attr('data-name') !== "Status") i.remove();
            });

            $('li.channel-item[data-server-id="'+uuid+'"][data-name="Status"]').click();

            $.limpClose();
          });

          html.on('click', 'button.connect-session', function(e) {
            e.preventDefault();
            if (Komanda.connections.hasOwnProperty(uuid)) {
              var connect = Komanda.connections[uuid];

              if (connect.hasClient) {
                console.log('SIMPLE CONNECT');

                connect.client.socket.conn.requestedDisconnect = true;
                connect.client.socket.conn.end();

                connect.client.socket.connect(20, function() {
                
                  if (Komanda.connections.hasOwnProperty(uuid)) {
                    Komanda.connections[uuid].hasClient = true;
                  }

                  Komanda.vent.trigger('connect', {
                    server: uuid
                  });
                }); 

              } else {
                connect.start(function(client) {
                  _.each(session.get('channels'), function(c) {
                    Komanda.vent.trigger(uuid + ":join", c);
                  });
                });
              };

              $.limpClose();
            };
          });

        },
        onAction: function() {
          view.editSession();
        },
        afterDestroy: function() {
          view.close();
          region.close();
        }
      });
      box.open();
    },

    addServer: function(e) {
      e.preventDefault();

      var session = new Session();

      var view = null;
      var region = null;


      var box = Helpers.limp.box(AddServerView, {
        edit: false
      }, {
        onOpen: function() {
        
          view = new SessionEditView({
            model: session
          });

          region = new Marionette.Region({
            el: '.komanda-box-content'
          });
        },
        afterOpen: function(limp, html) {

          region.show(view);
        },
        onAction: function() {
          view.saveSession();
        },
        afterDestroy: function() {
          view.close();
          region.close();
        }
      });
      box.open();
    },

    settings: function(e) {
      e.preventDefault();

      var view = null;
      var region = null;

      var box = Helpers.limp.box(SettingsIndexView, {}, {
        onOpen: function() {
          view = new SettingsEditView({
            model: Komanda.settings
          });

          region = new Marionette.Region({
            el: '#komanda-settings'
          });
        },
        afterOpen: function() {
          region.show(view);

          $('ul.komanda-box-menu li').on('click', function(e) {
            e.preventDefault();
            $('ul.komanda-box-menu li').removeClass('selected');
            $(this).addClass('selected');
            var show = $(this).attr('data-show');
            $('.settings-section-holder').hide();
            $(show).show();
          });
        },
        onAction: function() {
          Komanda.settings.save(null);
          $.limpClose();
        },
        afterDestroy: function() {
          view.close();
          region.close();
        }
      });
      box.open();
    },

    about: function(e) {
      e.preventDefault();
      var box = Helpers.limp.box(AboutView, {}, {});
      box.open();
    }

  });

});
