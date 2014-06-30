define([
  "marionette",
  "hbs!templates/channel",
  "underscore",
  "tabcomplete",
  "uuid",
  "moment",
  "highlight",
  "templates/helpers/timestamp"
], function(Marionette, template, _, tab, uuid, moment, hljs, timestamp) {

  return Marionette.ItemView.extend({
    tagName: "div",
    className: "channel",
    template: template,

    modelEvents: {
      "change:modes": "modesChanged"
    },

    events: {
      "keypress input": "sendMessage",
      "click div.message a": "openLink",
      "click div.user": "pm",
      "click div.show-more": "showMore",
      "click button.zen-button": "zenmode"
    },

    initialize: function() {
      var self = this;
      self.completerSetup = false;
      self.completer = null;
      self.plugs = [];
      self.messageAttachPoint = null; // gets set in onRender when the DOM node is loaded.
      self.toolbarAttachPoint = null; // gets set in onRender when the DOM node is loaded.
      self.toolbarElement = null;
      self.topicChangeCallbacks = []; // Array of callbacks to trigger when the channel topic is changed.

      Komanda.vent.on(self.model.get("server") + ":" + self.model.get("channel") + ":update:words", function(words, channels) {
        self.updateWords(false, false);
      });
    },

    getChannelAPI: function() {
      var self = this;

      var channelAPI = {
        getTimestamp: function(timeToStamp) {
          return timestamp(timeToStamp);
        },

        addChannelMessage: function(html) {
          if (html) {
            self.messageAttachPoint.append(html);

            // Not sure why this wont scroll the window down
            setTimeout(function() {
              Komanda.helpers.scrollUpdate(self.messageAttachPoint);
            }, 100);
          }
        },

        setToolbar: function(html) {
          if (html) {
            // if we already have an attached toolbar clear it before adding the new one.
            this.removeToolbar();
            self.toolbarElement = $(html).prependTo(self.toolbarAttachPoint);
            self.toolbarAttachPoint.addClass("toolbar-attached");
          }
        },

        removeToolbar: function() {
          if (self.toolbarElement) {
            self.toolbarAttachPoint.removeClass("toolbar-attached");
            self.toolbarElement.remove();
            self.toolbarElement = null;
          }
        },

        onChannelTopicChange: function(topicChangeCallback) {
          self.topicChangeCallbacks.push(topicChangeCallback);
        }
      };

      return _.extend({}, channelAPI); // return a new instance every time
    },

    loadPlugins: function() {
      // Needs to be called after the view has been rendered [onRender()] to ensure that the attach points have been inserted
      // in the DOM and can be passed safely to the plugins.
      var self = this;

      // Get a list of channel plugins from Komanda.settings:
      var channelPlugins = _.where(Komanda.settings.plugins, {"channel": true});

      _.each(channelPlugins, function(channelPlugin) {
        // Instantiate a new instance of the plugin.
        var thePlugin = new channelPlugin.plugin();
        // Add plugin info relevant to the channel.
        self.plugs.push({
          "name": channelPlugin.name,
          "topic": channelPlugin.topic,
          "plugin": thePlugin
        });
        // If this plugin has a stylesheet append it to the head now [overwriting any other stylesheet for this plugin].
        if (_.has(channelPlugin, "stylesheetPath")) {
          var pluginStyleId = channelPlugin.name + "-stylesheet";
          var pluginStyleLink = $("<link id=\"" + pluginStyleId + "\" rel=\"stylesheet\" href=\"" + channelPlugin.stylesheetPath + "\">");
          if ($("head #" + pluginStyleId).length > 0) {
            $("head #" + pluginStyleId).remove();
          }
          $("head").append(pluginStyleLink);
        }

        // Get a new instance of the channel API for this plugin.
        var pluginChannelAPI = self.getChannelAPI();
        // Initialize the plugin.
        thePlugin.initialize({ channelAPI: pluginChannelAPI });
      });

      // Now that all the plugins are loaded, hook in to topic changes.
      self.addTopicHooks();
    },

    addTopicHooks: function() {
      var self = this;

      // Listen for topic changes.
      Komanda.vent.on(self.model.get("server") + ":" + self.model.get("channel") + ":topic", function(topic) {
          // Call all registered topic change callbacks.
          if (!_.isEmpty(self.topicChangeCallbacks)) {
            _.each(self.topicChangeCallbacks, function(topicChangeCallback) {
              if (_.isFunction(topicChangeCallback)) {
                topicChangeCallback(topic);
              }
            });
          }
      });
    },

    onClose: function() {
      var self = this;

      // Foreach plugin, call plugin.close():
      _.each(self.plugs, function(channelPlug) {
        var thePlugin = channelPlug.plugin;
        thePlugin.close();
      });
    },

    zenmode: function(e) {
      var self = this;
      e.preventDefault();

      if ($("body").hasClass("zenmode")) {
        $("body").removeClass("zenmode");
        Komanda.helpers.scrollUpdate($(self.el).find(".messages"), true, 1);
      } else {
        $("body").addClass("zenmode");
      }
    },

    showMore: function(e) {
      e.preventDefault();
      var current = $(e.currentTarget);
      var ele =  current.attr("data-ele");
      var show = current.attr("data-show");

      $(show, ele).toggle();
    },

    pm: function(e) {
      e.preventDefault();

      var item = $(e.currentTarget);
      var nick = item.attr("data-name");
      var server = item.parents(".channel").attr("data-server-id");
      Komanda.vent.trigger(server + ":pm", nick);
    },

    setupAutoComplete: function() {
      var self = this;
      if (!self.completerSetup) {
        self.completerSetup = true;
        self.completer = tab($(this.el).find("input"), $("#main-search-suggestions"));
        self.updateWords();
      }
    },

    modesChanged: function() {
      var self = this;
      
      var text = self.model.get("channel");
      if (self.model.get("modes") !== "") {
        text += " (" + self.model.get("modes") + ")";
      }
      $(this.el).find(".chan-name").text(text);
    },

    updateWords: function(words, channels) {
      var self = this;
    
      var keys = _.keys(self.model.get("names")) || [];

      keys.push(Komanda.command.getCommands());

      if (Komanda.connections && _.has(Komanda.connections, self.model.get("server"))) {
        channels = _.map(Komanda.connections[self.model.get("server")].client.channels.models, function(c) {
          return c.get("channel").toLowerCase();
        });

        keys.push(channels);
      } else if (channels) {
        keys.push(channels);
      } else {
        // ...
      }

      var keysCommands = _.map(_.flatten(keys), function(k) {
        // return k.toLowerCase();
        return k;
      });

      if (!self.completer) {
        self.completerSetup = false;
        self.setupAutoComplete();
      }

      self.completer.words(keysCommands);
    },

    openLink: function(e) {
      e.preventDefault();
      var href = $(e.currentTarget).attr("href");
      Komanda.gui.Shell.openExternal(href);
      $(this.el).find("input").focus();
    },

    onRender: function() {
      var self = this;
      var $this = $(this.el);
      self.messageAttachPoint = $(self.el).find(".messages");
      self.toolbarAttachPoint = $(self.el);

      $this.attr("data-server-id", this.model.get("server"));
      $this.attr("data-name", this.model.get("channel"));

      self.setupAutoComplete();
      self.updateWords();
      // Load Channel Plugins
      self.loadPlugins();
    },

    focus: function(e) {
      $(this.el).find("input").focus();
    },

    sendMessage: function(e) {
      e.stopPropagation();

      var server = this.model.get("server");
      var message = $(e.currentTarget).val();

      if (e.charCode == 13) {
        if (message.length <= 0) return false;

        var textarea = $(e.currentTarget).parent(".input").find("textarea");
        textarea.val(message);

        $(e.currentTarget).val("");

        Komanda.history.add(message);
        Komanda.historyIndex = 0;

        Komanda.vent.trigger(server + ":send", {
          target: this.model.get("channel"),
          message: message
        });
      }
    }
  });
});
