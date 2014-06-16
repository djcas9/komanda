requirejs(["config"], function(require) {

  requirejs([
    "underscore",
    "marionette",
    "backbone-plugins",
    "app",
    "jquery",
    "router",
    "lib/layout/content",
    "lib/layout/sidebar",
    "connect",
    'lib/sessions/sessions',
    'lib/sessions/session',
    'history',
    'lib/settings',
    'helpers',
    "window-state"
  ], function(_, Marionette, Backbone, Komanda, $, Router, ContentView,
    SidebarView, Connect, Sessions, Session, History, Setting, Helpers, WindowState) {

      Komanda.settings = new Setting({id: 1});
      Komanda.settings.fetch();

      Komanda.connections = {};

      Komanda.history = new History(50);
      Komanda.historyIndex = 0;

      if (window.Notification) {
        Komanda.notification = window.Notification;
      }

      Komanda.commands = [
        "/help",
        "/nick",
        "/join",
        "/part",
        "/clear",
        "/topic",
        "/quit",
        "/disconnect",
        "/ignore",
        "/ignore-list",
        "/unignore"
      ];

    Komanda.sessions = new Sessions();
    Komanda.sessions.fetch();

    Komanda.message_count = 0;

    Komanda.current = {
      server: null,
      channel: null
    };

    Komanda.vent.on('komanda:ready', function() {
      Komanda.gui = requireNode('nw.gui');
      Komanda.window = Komanda.gui.Window.get();

      Helpers.loadTheme(Komanda.settings.attributes, function() {
        WindowState();
      });

      Komanda.vent.on('komanda:debug', function() {
        Komanda.window.showDevTools();
      });

      $('.window-button.close').on('click', function(e) {
        e.preventDefault();
        Komanda.window.close();
      });

      $('.window-button.minimize').on('click', function(e) {
        e.preventDefault();
        Komanda.window.minimize();
      });

      $('.window-button.maximize').on('click', function(e) {
        e.preventDefault();
        Komanda.window.maximize();
      });

      _.each(Komanda.sessions.models, function(m) {
        m.set('connectionOpen', false);
        var connect = new Connect(m);

        Komanda.connections[m.get('uuid')] = connect;

        if (m.get('connectOnStart')) {
          connect.start(function(client) {
            _.each(m.get('channels').split(','), function(c) {
              Komanda.vent.trigger(m.get('uuid') + ":join", c.trim());
            });
          });
        }

      });
    });

    Komanda.addInitializer(function(options) {
      Komanda.router = Komanda.r = new Router();
    });

    Komanda.on("initialize:after", function(options) {

      if (Backbone.history) {
        Backbone.history.start({
          pushState: false,
          root: "/",
          silent: false
        });
      }

    });

    Komanda.addRegions({
      mainRegion: "#main",
      sidebarRegion: "#main"
    });

    Komanda.mainRegion.show(new ContentView());
    Komanda.sidebarRegion.show(new SidebarView());

    Komanda.start();
    Komanda.vent.trigger("komanda:ready");
  });
});
