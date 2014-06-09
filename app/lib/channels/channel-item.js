define([
  "marionette", 
  "hbs!templates/channel-item",
], function(Marionette, template) {

  return Marionette.ItemView.extend({
    tagName: 'li',
    className: "channel-item",
    template: template,

    events: {
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render());
    },

    onClose: function() {
    },

    onRender: function() {
      var $this = $(this.el);
      var server = this.model.get('server');
      var channel = this.model.get('channel');

      $this.attr('data-server-id', server);
      $this.attr('data-name', channel);

      if (Komanda.current.server === server && Komanda.current.channel === channel) {
        $('li.channel-list').removeClass('selected');
        $this.addClass('selected');
      }

    }
  });

});
