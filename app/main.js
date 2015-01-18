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
    "plugins",
    "window-state",
    "lib/embed/index",
    "command",
    "lib/deps/ion.sound",
    "lib/channels/channel",
  ], function(_, Marionette, Backbone, Komanda, $, Router, ContentView,
    SidebarView, Connect, Sessions, Session, History, Setting, Helpers, PluginLoader, WindowState, Embed, Command, ionSound, Channel) {

      // We should use domains instead
      window.process.on("uncaughtException", function(err) {
        console.log("Caught exception: " + err);
      });

      Komanda.version = requireNode("./package.json").version + " @@GIT_REVISION";

      Komanda.helpers = Helpers;

      Komanda.settings = new Setting({
        id: 2
      });

      Komanda.settings.fetch();

      Komanda.settings.set("themes.list", Setting.prototype.defaults.themes.list);

      Komanda.settings.save(null);

      Embed(Komanda);

      PluginLoader.loadPlugins();

      if (!Komanda.settings.attributes.notifications.hasOwnProperty("badge")) {
        Komanda.settings.set("notifications.badge", true);
      }

      Komanda.badgeCounter = 0;
      Komanda.blur = false;

      Komanda.connections = {};

      Komanda.history = new History(50);
      Komanda.historyIndex = 0;

      // Currently Notification crashes on Windows. It does not crash
      // node-webkit on construction, but rather later on in its
      // deferred execution.
      if (window.Notification && !/win/.test(process.platform)) {
        Komanda.Notification = window.Notification;
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

      // internal commands go here
      // make sure to set priority on internal functions so plugins have to explicity set priority to override
      // String: 4
      // RegExp: 5
      // Function: 6
      Komanda.cmd("msg", function(client, data, args) {
        var msg = args.slice(1).join(" ");
        _.each(args[0].split(","), function(target) {
          Komanda.vent.trigger(client.options.uuid + ":send", {
            target: target,
            message: msg
          });
          Komanda.vent.trigger(client.options.uuid + ":pm", target);
        });
      }, 4);

      Komanda.cmd("query", function(client, data, args) {
        Komanda.vent.trigger(client.options.uuid + ":pm", args[0]);
      }, 4);

      Komanda.cmd("me", function(client, data, args) {
        client.socket.action(data.target, args.join(" "));
        client.addMessage(data.target, args.join(" "), true);
      }, 4);

      Komanda.cmd("whois", function(client, data, args) {
        if (args.length > 0) {
          client._whois[args[0].toLowerCase()] = {};
          client.socket.send("WHOIS", args[0]);
        }
      }, 4);

      Komanda.cmd("part", function(client, data, args) {
        var channels = (args[0]) ? args[0].split(",") : [data.target];
        var msg = args.slice(1).join(" ") || "Bye!";

        _.each(channels, function(channel) {
          if (!Channel.isChannel(channel)) {
           return;
          }

          client.socket.part(channel, msg, function() {
            var chan = client.findChannel(channel);

            if (chan) {
              client.removeAndCleanChannel(chan, client.options.uuid);
            }

            Komanda.vent.trigger("channel/part", client.options.uuid, channel);
          });
        });
      }, 4);

      Komanda.cmd("clear", function(client, data, args) {
        $("div.channel[data-server-id=\"" + client.options.uuid + "\"][data-name=\"" + data.target + "\"] div.messages").html("");
      }, 4);

      Komanda.cmd("notice", function(client, data, args) {
        client.socket.notice(args[0], args.slice(1).join(" "));
        //render(true); // is this needed?
      }, 4);

      Komanda.cmd("mode", function(client, data, args) {
        var curChan = data.target, modes;
        if (args.length === 0) {
          // want modes for current channel
          client.socket.send("MODE", curChan);
          return;
        }
        if (Channel.isChannel(args[0])) {
          // first arg is a channel, so we want that channel
          curChan = args[0];
          modes = args[1];
        } else {
          modes = args[0];
        }
        if(modes) {
          // We are setting modes
          client.socket.send("MODE", curChan, modes);
        } else {
          client.socket.send("MODE", curChan);
        }
      });

      Komanda.cmd("umode", function(client, data, args) {
        if (args.length === 0) {
          // want modes for the user
          client.socket.send("MODE", client.nick);
          return;
        }
        modes = args[0];
        // We are setting modes for the user
        client.socket.send("MODE", client.nick, modes);
      });

      Komanda.cmd("set", function(client, data, args) {
        var setting;

        if (args.length === 0) {
          client.statusMessage(JSON.stringify(Komanda.settings.toJSON()));
        } else if (args.length === 1) {
          setting = Komanda.settings.get(args[0]);
          client.statusMessage(args[0] + " = " + _.isObject(setting) || _.isArray(setting) ? JSON.stringify(setting) : setting);
        } else if (args.length === 2) {
          var val;

          try {
            val = JSON.parse(args[1]);
          } catch (e) {
            val = args[1];
          }

          Komanda.settings.set(args[0], val);
          setting = Komanda.settings.get(args[0]);
          client.statusMessage(args[0] + " = " + _.isObject(setting) || _.isArray(setting) ? JSON.stringify(setting) : setting);
        }
      }, 4);

      Komanda.cmd("quit", function(client, data, args) {
        var quitMessage;
        if (!_.isEmpty(args)) { // if a quit message was provided, use it.
          quitMessage = args.join(" ");
        } else if (!_.isEmpty(Komanda.settings.get("messages.quit"))) { // if a quit message was set in the settings, use it.
          quitMessage = Komanda.settings.get("messages.quit");
        } else { // if there still isn't a quit message then use the defaultQuit message [not exposed in the GUI]
          quitMessage = Komanda.settings.get("messages.defaultQuit");
        }

        client.allowReconnect = false;

        client.socket.disconnect(quitMessage);

         Komanda.vent.trigger(client.options.uuid + ":disconnect", function() {
          client.attemptingReconnect = true;
          client.session.set("connectionOpen", false);

          Komanda.connections[client.options.uuid].inReconnect = false;
          clearInterval(client.reconnectCheck);
          client.socket.emit("connection:abort", client.retryCount, client.retryCountCurrent);
        });
      }, 4);

      Komanda.cmd("devtools", function(client, data, args) {
        Komanda.vent.trigger("komanda:debug");
      }, 4);

      // aliases
      Komanda.cmd("q", "query", 4);
      Komanda.cmd("pm", "query", 4);
      Komanda.cmd("m", "msg", 4);
      Komanda.cmd("j", "join", 4);
      Komanda.cmd("m", "msg", 4);

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

        // Create default menus in OSX for copy/paste support.
        // https://github.com/rogerwang/node-webkit/wiki/Menu#menucreatemacbuiltinappname
        if (requireNode("os").platform() === "darwin") {
            var mb = new Komanda.gui.Menu({ type: "menubar" });
            if (mb.createMacBuiltin) {
                mb.createMacBuiltin("Komanda");

                // Add default OSX Preferences menu item and key binding
                mb.items[0].submenu.insert(new Komanda.gui.MenuItem({ type: "separator" }), 2);
                mb.items[0].submenu.insert(new Komanda.gui.MenuItem({
                  type: "normal",
                  label: "Preferences",
                  key: ",",
                  modifiers: "cmd",
                  click: function() {
                    // Only respond if a dialog box is not currently open
                    if ($("#limp-box-overlay").length === 0) {
                      $("#master-control .settings").trigger("click");
                    }
                  }
                }), 2);

                Komanda.window.menu = mb;
            }
        }

        // When komanda is ready, we use this function to register the sounds we will use.
        // An explanation of how to add them can be found on this pull request: https://github.com/mephux/komanda/pull/136
        $.ionSound({
          sounds: [
            "glass:1.0",
            "water_droplet:0.5"
          ],
          path: "app://host/sounds/"
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
            Komanda.helpers.scrollUpdate(chan, true, 1);
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
