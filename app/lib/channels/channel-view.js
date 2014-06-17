define([
  "marionette", 
  "hbs!templates/channel",
  "underscore",
  "tabcomplete",
], function(Marionette, template, _, tab) {

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

      Komanda.vent.on(self.model.get('server') + ":" + self.model.get('channel') + ":update:words", function(words, channels) {
        self.updateWords(words, channels);
      });

      Komanda.vent.on(self.model.get('server') + ":" + self.model.get('channel') + ":topic", function(topic) {
        console.log("TOPIC:::", topic);
        // var match = topic.match(/http(s)?:\/\/(.*\.)?github.com\/(.\S+)(\/(.+))?(.git)?$/);

        // if (match[2]) {
          // Komanda.vent.trigger(match[0], {
            // channel: self.model.get('channel'),
            // server: self.model.get('server'),
            // data: match[1]
          // });
        // }

        // https://api.github.com/repos/mephux/komanda/events
        // check if topic has git repo
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
      console.log(e);
      $(this.el).find('input').focus();
    },

    sendMessage: function(e) {
      e.stopPropagation();
      var server = this.model.get('server');
      var message = $(e.currentTarget).val();

      if (e.charCode == 13) {

        if (message.length <= 0) return false;

        $(e.currentTarget).val("");

        Komanda.history.add(message);
        Komanda.historyIndex = 0;

        Komanda.vent.trigger(server + ':send', {
          target: this.model.get('channel'),
          message: message
        });
      }
    }
  });

});
