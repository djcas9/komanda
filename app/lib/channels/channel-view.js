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
    tagName: 'div',
    className: "channel",
    template: template,

    events: {
      "keypress input": "sendMessage",
      "click div.message a": "openLink",
      "mouseup div.message a": "openLink",
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
          if (r.feed[0].id !== self.last_feed_id) {
            // .. add new feed items to channel

            var newFeedItems = [];
            r.feed.every(function(f) {
              if (f.id === self.last_feed_id) return;
              newFeedItems.push(f);
            });

            self.last_feed_id = r.feed[0].id;

            var html = GithubFeedItem({
              items: newFeedItems,
              uuid: uuid.v4(),
              server: self.model.get('server'),
              timestamp: moment().format('MM/DD/YY hh:mm:ss')
            });

            $(self.el).find('.messages').append(html);

            var objDiv = $(self.el).find('.messages').get(0);
            objDiv.scrollTop = objDiv.scrollHeight;
          }
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
        console.log('UPDATE TOPIC');

        self.githubBar = $('.github-plugin-bar[data-server-id="'+self.model.get('server')+'"][data-name="'+self.model.get('channel')+'"]');

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

              self.pluginReDraw(function() {
                // set the first feed cache id
                self.last_feed_id = self.repo.feed[0].id;
              });

            } else {
              if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
              if (self.githubBar) self.githubBar.remove();
              $(self.el).removeClass('github-plugin');
            } // has match index 3
          } else {
            if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
            if (self.githubBar) self.githubBar.remove();
            $(self.el).removeClass('github-plugin');
          } // has match
        } else {
          if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);
          if (self.githubBar) self.githubBar.remove();
          $(self.el).removeClass('github-plugin');
        } // has topic

      });
    },

    pluginReDraw: function(callback) {
      var self = this;

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

        if (self.githubBar && self.githubBar.length > 0) {
          self.githubBar.replaceWith(html);
        } else {
          $(self.el).prepend(html).addClass('github-plugin');
          self.githubBar = $('.github-plugin-bar[data-server-id="'+params.server+'"][data-name="'+params.channel+'"]');
        }

        var objDiv = $(self.el).find('.messages').get(0);
        if (objDiv) objDiv.scrollTop = objDiv.scrollHeight;

        if (self.githubUpdateCheck) clearInterval(self.githubUpdateCheck);

        self.githubUpdateCheck = setInterval(self.githubUpdateFunction, 20000);

        if (callback && typeof callback === "function") callback();
      });

    },

    updateAndRender: function(callback, errorback) {
      var self = this;

      $.ajax({
        url: self.metadataURL,
        dataType: "json",
        type: "get",
        ifModified: false,
        success: function(metadata) {

          $.ajax({
            url: self.feedURL,
            dataType: "json",
            type: "get",
            ifModified: false,
            success: function(feed) {
              if (metadata) self.repo.metadata = metadata;

              if (feed) {
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
