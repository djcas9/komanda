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
    "lib/sessions/sessions",
    "lib/sessions/session",
    "history",
    "lib/settings",
    "helpers",
    "window-state",
    "lib/embed/index",
    "command",
    "lib/deps/ion.sound"
  ], function(_, Marionette, Backbone, Komanda, $, Router, ContentView,
    SidebarView, Connect, Sessions, Session, History, Setting, Helpers, WindowState, Embed, Command, ionSound) {

      // We should use domains instead
      window.process.on("uncaughtException", function(err) {
        console.log("Caught exception: " + err);
      });

      Komanda.helpers = Helpers;

      Komanda.settings = new Setting({
        id: 2
      });

      Komanda.settings.fetch();

      Komanda.settings.set("themes.list", Setting.prototype.defaults.themes.list);

      Komanda.settings.save(null);

      Embed(Komanda);

      if (!Komanda.settings.attributes.notifications.hasOwnProperty("badge")) {
        Komanda.settings.set("notifications.badge", true);
      }

      Komanda.badgeCounter = 0;
      Komanda.blur = false;

      Komanda.connections = {};

      Komanda.history = new History(50);
      Komanda.historyIndex = 0;

      if (window.Notification) {
        Komanda.notification = window.Notification;
      }

      Komanda.command = Command;

      Komanda.cmd = Komanda.command.register;

      Komanda.sessions = new Sessions();
      Komanda.sessions.fetch();

      Komanda.message_count = 0;

      Komanda.current = {
        server: null,
        channel: null
      };

      /**
       * This event gets triggered by client.js when a message, a highlight, or a pm is received.
       * The function receives the type of notification as a parameter.
       * @param  {string}       The type of sound to play
       * @return {none}         This function does not return a value
       */
      Komanda.vent.on("komanda:soundnotification", function(sound) {
        switch (sound) {
          case "chat":
            if (Komanda.settings.get("sounds.chat")) {
              $.ionSound.play("water_droplet");
            }
            break;
          case "highlight":
            if (Komanda.settings.get("sounds.highlight")) {
              $.ionSound.play("glass");
            }
            break;
          case "pm":
            if (Komanda.settings.get("sounds.pm")) {
              $.ionSound.play("glass");
            }
            break;
        }
      });

      Komanda.vent.on("komanda:update:badge", function(args) {
        if (Komanda.settings.get("notifications.badge") && Komanda.window.setBadgeLabel) {
          var masterCount = 0;

          for (var srv in Komanda.store) {
            var chans = Komanda.store[srv].count;
            for (var chan in chans) {
              var count = chans[chan];
              if (count) masterCount += count;
            }
          }

          if (masterCount) {
            if (masterCount === 0) {
              Komanda.window.setBadgeLabel("");
            } else {
              Komanda.window.setBadgeLabel("" + masterCount + "");
            }
          } else {
            Komanda.window.setBadgeLabel("");
          }
        } else {
          _.each(Komanda.store, function(s) {
            s.count = {};
          });

          if (window.setBadgeLabel) Komanda.window.setBadgeLabel("");
        }
      });

      Komanda.vent.on("komanda:ready", function() {
        Komanda.gui = requireNode("nw.gui");
        Komanda.window = Komanda.gui.Window.get();

        // When komanda is ready, we use this function to register the sounds we will use.
        // An explanation of how to add them can be found on this pull request: https://github.com/mephux/komanda/pull/136
        $.ionSound({
          sounds: [
            "glass:1.0",
            "water_droplet:0.5"
          ],
          path: "app://host/sounds/" // This folder is made by grunt, you should add sound files inside /app/sounds
        });

        Komanda.window.on("new-win-policy", function(frame, url, policy) {
          policy.ignore();
        });

        $(document).on("click", "button.plugin-button", function(e) {
          e.preventDefault();
          var href = $(this).attr("data-href");
          Komanda.gui.Shell.openExternal(href);
        });

        $(document).on("keypress", function(e) {
          if (Komanda.current) {
            $(".channel[data-server-id=\"" + Komanda.current.server + "\"][data-name=\"" + Komanda.current.channel + "\"] input").focus();
          }
        });

        Komanda.window.on("resize", function(e) {
          if (Komanda.current) {
            var chan = $(".channel[data-server-id=\"" + Komanda.current.server + "\"][data-name=\"" + Komanda.current.channel + "\"] .messages");
            Komanda.helpers.scrollUpdate(chan, true, 0);
          }
        });

        Komanda.window.on("blur", function() {
          Komanda.blur = true;
        });

        Komanda.window.on("focus", function() {
          Komanda.blur = false;
          if (Komanda.store.hasOwnProperty(Komanda.current.server)) {
            Komanda.store[Komanda.current.server].count[Komanda.current.channel] = 0;
          }

          Komanda.vent.trigger("komanda:update:badge");
        });

        // Komanda.window.window.onblur = function() {
        // };

        // Komanda.window.window.onfocus = function() {
        // };

        Helpers.loadTheme(Komanda.settings.attributes, function() {
          WindowState();
        });

        Komanda.vent.on("komanda:debug", function() {
          Komanda.window.showDevTools();
        });

        $(".window-button.close").on("click", function(e) {
          e.preventDefault();
          Komanda.window.close();
        });

        $(".window-button.minimize").on("click", function(e) {
          e.preventDefault();
          Komanda.window.minimize();
        });

        $(".window-button.maximize").on("click", function(e) {
          e.preventDefault();
          if ($(".window-button.maximize").data("is-maximized")) {
            Komanda.window.unmaximize();
            $(".window-button.maximize").data("is-maximized", false);
          } else {
            Komanda.window.maximize();
            $(".window-button.maximize").data("is-maximized", true);
          }
        });

        $(".window-button-fullscreen").on("click", function(e) {
          if ($(".window-button.maximize").data("is-maximized", false)) {
            Komanda.window.toggleFullscreen();
          }
        });

        _.each(Komanda.sessions.models, function(m) {
          m.set("connectionOpen", false);
          var connect = new Connect(m);

          Komanda.connections[m.get("uuid")] = connect;

          if (m.get("connectOnStart")) {
            connect.start(function(client) {
              _.each(m.get("channels"), function(c) {
                if (c.trim().length > 0) {
                  Komanda.vent.trigger(m.get("uuid") + ":join", c);
                }
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
