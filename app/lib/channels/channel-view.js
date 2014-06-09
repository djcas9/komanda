define([
  "marionette", 
  "hbs!templates/channel",
  "underscore",
  "tabcomplete"
], function(Marionette, template, _, tab) {

  return Marionette.ItemView.extend({
    tagName: 'div',
    className: "channel",
    template: template,

    events: {
      "keypress input": "sendMessage",
      "click div.message a": "openLink"
    },

    initialize: function() {
    },

    onClose: function() {
    },

    setupAutoComplete: function() {
      var self = this;
      var keys = _.keys(self.model.get('names'));
      var completer = tab($(this.el).find('input'), $('#main-search-suggestions'));
      completer.words(keys);
    },

    openLink: function(e) {
      e.preventDefault();
      var href = $(e.currentTarget).attr('href');
      Komanda.gui.Shell.openExternal(href);
    },

    onRender: function() {
      var self = this;
      var $this = $(this.el);
      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-name', this.model.get('channel'));

      self.setupAutoComplete();
    },

    sendMessage: function(e) {
      var server = this.model.get('server');
      var message = $(e.currentTarget).val();


      if (e.charCode == 13) {

        if (message.length <= 0) return false;

        $(e.currentTarget).val("");
        Komanda.vent.trigger(server + ':send', {
          target: this.model.get('channel'),
          message: message
        });
      }
    }
  });

});
