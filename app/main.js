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
    'lib/sessions/session'
  ], function(_, Marionette, Backbone, Komanda, $, Router, ContentView, 
    SidebarView, Connect, Sessions, Session) {

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

    if (Komanda.sessions.models.length <= 0) {
      // create default session
      var session = Komanda.sessions.create({
        id: 1
      });

      Komanda.sessions.add(session);

      session.set({
        channels: ["#wordup"]
      });

      session.save(null);


    }

    Komanda.vent.on('komanda:ready', function() {
      Komanda.gui = requireNode('nw.gui');
      Komanda.window = Komanda.gui.Window.get();
      Komanda.window.show();


      Komanda.vent.on('komanda:debug', function() {
        Komanda.window.showDevTools();
      });

      Komanda.window.on('close', function() {
        this.hide();

        if (Komanda.window !== null)
          Komanda.window.close(true);

        this.close(true);
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
        var connect = new Connect(m); 

        if (m.get('connectOnStart')) {
          connect.start(function(client) {
            _.each(m.get('channels'), function(c) {
              Komanda.vent.trigger(m.get('uuid') + ":join", c);
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
