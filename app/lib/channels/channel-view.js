define([
  "marionette",
  "hbs!templates/channel",
  "underscore",
  "tabcomplete",

  "hbs!templates/plugins/github/index"
], function(Marionette, template, _, tab, GithubView) {

  return Marionette.ItemView.extend({
    tagName: 'div',
    className: "channel",
    template: template,

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

      self.githubUpdateFunction = function() {
        self.updateAndRender(function(r) {
          console.log("UPDATE:::", self.model.get('channel'), r);
        });
      };

      self.githubUpdateCheck = null;

      self.repo = {
        metadata: null,
        feed: null
      };

      Komanda.vent.on(self.model.get('server') + ":" + self.model.get('channel') + ":update:words", function(words, channels) {
        self.updateWords(words, channels);
      });

      // Load Channel Plugins
      self.plugins();
    },

    plugins: function() {
      var self = this;

      // Not sure this is the best place for this.
      Komanda.vent.on(self.model.get('server') + ":" + self.model.get('channel') + ":topic", function(topic) {
        if (topic) {
          var match = topic.match(/http(s)?:\/\/.*\.?github.com\/(.[\w|\-|\/]+)/);

          if (match) {
            var key = match[2];

            if (key) {
              self.metadataURL = "";
              self.feedURL = "";

              if (/\/$/.test(key)) {
                key = key.replace(/\/$/, '');
              }

              if (/\//.test(key)) {
                self.metadataURL = "https://api.github.com/repos/" + key;
                self.feedURL = "https://api.github.com/repos/" + key + "/events";
              } else {
                self.metadataURL = "https://api.github.com/orgs/" + key;
                self.feedURL = "https://api.github.com/orgs/" + key + "/events";
              }

              self.updateAndRender(function(repo) {
                var params = {
                  server: self.model.get('server'),
                  channel: self.model.get('channel'),
                  repo: repo,
                  isOrg: false
                };

                if (repo.metadata.hasOwnProperty('type')) {
                  if (repo.metadata.type === "Organization") {
                    params.isOrg = true;
                  }
                }

                var html = GithubView(params);
                self.githubBar = $('.github-plugin-bar[data-server-id="'+params.server+'"][data-name="'+params.channel+'"]');
                $(self.el).prepend(html).addClass('github-plugin');

                console.log(self.model.get('channel'), repo);
                self.githubUpdateCheck = setInterval(self.githubUpdateFunction, 30000);
              });

            } // has match index 3
          } // has match
        } // has topic

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
              if (metadata) self.repo.metadata = metadata;
              if (feed) self.repo.feed = feed;

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
      if (self.scroll) {
        self.scroll.destroy();
        self.scroll = null;
      };

      Komanda.vent.off()
    },

    zenmode: function(e) {
      e.preventDefault();

      if ($('body').hasClass('zenmode')) {
        $('body').removeClass('zenmode');
      } else {
        $('body').addClass('zenmode');
      };
    },

    showMore: function(e) {
      e.preventDefault();
      var current = $(e.currentTarget);
      var ele =  current.attr('data-ele');
      var show = current.attr('data-show');

      $(show, ele).toggle();
    },

    pm: function(e) {
      e.preventDefault();

      var item = $(e.currentTarget);
      var nick = item.attr('data-name');
      var server = item.parents('.channel').attr('data-server-id');
      Komanda.vent.trigger(server + ":pm", nick);
    },

    setupAutoComplete: function() {
      var self = this;
      if (!self.completerSetup) {
        self.completerSetup = true;
        self.completer = tab($(this.el).find('input'), $('#main-search-suggestions'));
        self.updateWords();
      };
    },

    updateWords: function(words, channels) {
      var self = this;

      var keys = words ? _.keys(words) : _.keys(self.model.get('names'));
      keys.push(Komanda.commands)

      if (channels) keys.push(channels);
      var keysCommands = _.flatten(keys);

      if (!self.completer) {
        self.completerSetup = false;
        self.setupAutoComplete();
      }

      self.completer.words(keysCommands);
    },

    openLink: function(e) {
      e.preventDefault();
      var href = $(e.currentTarget).attr('href');
      Komanda.gui.Shell.openExternal(href);
      $(this.el).find('input').focus();
    },

    onRender: function() {
      var self = this;
      var $this = $(this.el);

      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-name', this.model.get('channel'));

      self.setupAutoComplete();
      self.updateWords();
    },

    focus: function(e) {
      $(this.el).find('input').focus();
    },

    sendMessage: function(e) {
      e.stopPropagation();

      var server = this.model.get('server');
      var message = $(e.currentTarget).val();

      if (e.charCode == 13) {
        if (message.length <= 0) return false;

        var textarea = $(e.currentTarget).parent('.input').find('textarea');
        textarea.val(message);

        $(e.currentTarget).val("");

        Komanda.history.add(message);
        Komanda.historyIndex = 0;

        if(message.split(" ")[0] === '/devtools') {
          Komanda.vent.trigger('komanda:debug');
          return;
        }

        Komanda.vent.trigger(server + ':send', {
          target: this.model.get('channel'),
          message: message
        });
      }
    }
  });

});
