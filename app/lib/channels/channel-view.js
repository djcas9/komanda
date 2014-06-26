define([
  "marionette",
  "hbs!templates/channel",
  "underscore",
  "tabcomplete",
  "uuid",
  "moment",
  "highlight",

  "hbs!templates/plugins/github/index",
  "hbs!templates/plugins/github/feed-item"
], function(Marionette, template, _, tab, uuid, moment, hljs, GithubView, GithubFeedItem) {

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
      self.last_feed_id = 0;

      self.githubUpdateFunction = function() {
        self.updateAndRender(function(r) {


          if (r.feed[0]) {
            if (r.feed[0].id !== self.last_feed_id) {
              // .. add new feed items to channel

              var newFeedItems = self.newFeeditems(r.feed);

              self.last_feed_id = r.feed[0].id;

              var html = GithubFeedItem({
                items: newFeedItems,
                uuid: uuid.v4(),
                server: self.model.get("server")
              });

              $(self.el).find(".messages").append(html);

              // Not sure why this wont scroll the window down
              setTimeout(function() {
                Komanda.helpers.scrollUpdate($(self.el).find(".messages"));
              }, 100);
            }
          }

        });
      };

      self.githubUpdateCheck = null;

      self.repo = {
        metadata: {},
        feed: []
      };

      Komanda.vent.on(self.model.get("server") + ":" + self.model.get("channel") + ":update:words", function(words, channels) {
        self.updateWords(false, false);
      });

      // Load Channel Plugins
      self.plugins();
    },

    newFeeditems: function(feed) {
      var self = this;

      var newFeedItems = [];
      var len = feed.length;

      if (len > 0) {

        for (var i = 0; i < len; i += 1) {
          var id = feed[i].id;

          if (id === self.last_feed_id) {
            return newFeedItems;
          } else {
            newFeedItems.push(feed[i]);
          }
        }

      } else {
        return [];
      }
    },

    plugins: function() {
      var self = this;

      // Not sure this is the best place for this.
      Komanda.vent.on(self.model.get("server") + ":" + self.model.get("channel") + ":topic", function(topic) {
        self.githubBar = $(".github-plugin-bar[data-server-id=\"" + self.model.get("server") + "\"][data-name=\"" + self.model.get("channel") + "\"]");

        if (topic) {
          var match = topic.match(/http(s)?:\/\/.*\.?github.com\/(.[\w|\-|\/]+)/);

          if (match) {
            var key = match[2];

            if (key) {
              self.metadataURL = "";
              self.feedURL = "";

              if (/\/$/.test(key)) {
                key = key.replace(/\/$/, "");
              }

              if (/\//.test(key)) {
                self.metadataURL = "https://api.github.com/repos/" + key;
                self.feedURL = "https://api.github.com/repos/" + key + "/events";
              } else {
                self.metadataURL = "https://api.github.com/orgs/" + key;
                self.feedURL = "https://api.github.com/orgs/" + key + "/events";
              }

              self.pluginReDraw(function() {
                // set the first feed cache id
                if (self.repo.feed[0]) self.last_feed_id = self.repo.feed[0].id;
              });

            } else {
              if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
              if (self.githubBar) self.githubBar.remove();
              $(self.el).removeClass("github-plugin");
            } // has match index 3
          } else {
            if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
            if (self.githubBar) self.githubBar.remove();
            $(self.el).removeClass("github-plugin");
          } // has match
        } else {
          if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
          if (self.githubBar) self.githubBar.remove();
          $(self.el).removeClass("github-plugin");
        } // has topic

      });
    },

    pluginToolbar: function(repo) {
      var self = this;

      var params = {
        server: self.model.get("server"),
        channel: self.model.get("channel"),
        repo: repo,
        isOrg: false
      };

      self.githubBar = $(".github-plugin-bar[data-server-id=\"" + params.server + "\"][data-name=\"" + params.channel + "\"]");

      if (repo.metadata.hasOwnProperty("type")) {
        if (repo.metadata.type === "Organization") {
          params.isOrg = true;
        }
      }

      var html = GithubView(params);

      if (self.githubBar && self.githubBar.length > 0) {
        self.githubBar.replaceWith(html);
      } else {
        $(self.el).prepend(html).addClass("github-plugin");
        self.githubBar = $(".github-plugin-bar[data-server-id=\"" + params.server + "\"][data-name=\"" + params.channel + "\"]");
      }
    },

    pluginReDraw: function(callback) {
      var self = this;

      self.updateAndRender(function(repo) {

        self.pluginToolbar(repo);

        if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);

        self.githubUpdateCheck = setInterval(self.githubUpdateFunction, 20000);

        if (callback && typeof callback === "function") callback(repo);
      });

    },

    updateAndRender: function(callback, errorback) {
      var self = this;

      $.ajax({
        url: self.metadataURL,
        dataType: "json",
        type: "get",
        ifModified: true,
        success: function(metadata) {

          $.ajax({
            url: self.feedURL,
            dataType: "json",
            type: "get",
            ifModified: true,
            success: function(feed) {
              if (metadata && !_.isEmpty(metadata)) {
                self.repo.metadata = metadata;
                self.pluginToolbar(self.repo);
              }

              if (feed && feed.length > 0) {
                self.repo.feed = feed;
              }

              if (callback && typeof callback === "function") {
                return callback(self.repo);
              }
            },
            error: function(a,b,c) {
              console.log("ERROR:::", a,b,c);
              if (errorback && typeof errorback === "function") {
                errorback(a,b,c);
              }
            }
          });
        },
        error: function(a,b,c) {
          console.log("ERROR:::", a,b,c);
          if (errorback && typeof errorback === "function") {
            errorback(a,b,c);
          }
        }
      });

    },

    onClose: function() {
      var self = this;

      if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
      if (self.githubBar) self.githubBar.remove();
    },

    zenmode: function(e) {
      e.preventDefault();

      if ($("body").hasClass("zenmode")) {
        $("body").removeClass("zenmode");
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

      keys.push(Komanda.commands);

      if (Komanda.connections && Komanda.connections.hasOwnProperty(self.model.get("server"))) {
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

      $this.attr("data-server-id", this.model.get("server"));
      $this.attr("data-name", this.model.get("channel"));

      self.setupAutoComplete();
      self.updateWords();
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

        if(message.split(" ")[0] === "/devtools") {
          Komanda.vent.trigger("komanda:debug");
          return;
        }

        Komanda.vent.trigger(server + ":send", {
          target: this.model.get("channel"),
          message: message
        });
      }
    }
  });

});
