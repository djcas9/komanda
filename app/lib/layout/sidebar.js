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

    limpOnClose: function() {
      $(document).on('keypress', function(e) {
        if (Komanda.current) {
          $('.channel[data-server-id="'+Komanda.current.server+'"][data-name="'+Komanda.current.channel+'"] input').focus();
        }
      });
    },

    onShow: function() {
    },

    editServer: function(e) {
      var self = this;

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
          $(document).off('keypress');

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

            view.editSession();

            if (Komanda.connections.hasOwnProperty(uuid)) {
              var connect = Komanda.connections[uuid];

              if (connect.hasClient) {

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
          self.limpOnClose();
          view.close();
          region.close();
        }
      });
      box.open();
    },

    addServer: function(e) {
      var self = this;
      e.preventDefault();

      var session = new Session();

      var view = null;
      var region = null;


      var box = Helpers.limp.box(AddServerView, {
        edit: false
      }, {
        onOpen: function() {
          $(document).off('keypress');

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
          self.limpOnClose();
          view.close();
          region.close();
        }
      });
      box.open();
    },

    settings: function(e) {
      var self = this;
      e.preventDefault();

      var view = null;
      var region = null;

      var box = Helpers.limp.box(SettingsIndexView, {}, {
        onOpen: function() {
          $(document).off('keypress');

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
          Komanda.vent.trigger('komanda:update:badge')
          $.limpClose();
        },
        afterDestroy: function() {
          self.limpOnClose();
          view.close();
          region.close();
        }
      });
      box.open();
    },

    about: function(e) {
      var self = this;
      e.preventDefault();
      var box = Helpers.limp.box(AboutView, {}, {
        onOpen: function() {
          $(document).off('keypress');
        },
        afterOpen: function() {
          $('.komanda-box-content a').on('click', function(e) {
            e.preventDefault();

            var href = $(this).attr('href');
            Komanda.gui.Shell.openExternal(href);
          });
        },
        afterDestroy: function() {
          self.limpOnClose();
        }
      });
      box.open();
    }

  });

});
