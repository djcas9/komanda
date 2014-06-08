define([
  "marionette", 
  "hbs!templates/channel",
], function(Marionette, template) {

  return Marionette.ItemView.extend({
    tagName: 'div',
    className: "channel",
    template: template,

    events: {
      "keypress input": "sendMessage"
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.channelItemUpdate);
      this._modelBinder = new Backbone.ModelBinder();
    },

    channelitemUpdate: function() {
      this.render();
    },

    onClose: function() {
      this._modelBinder.unbind();
    },

    onRender: function() {
      var $this = $(this.el);
      $this.attr('data-server-id', this.model.get('server'));
      $this.attr('data-name', this.model.get('channel'));
    },

    sendMessage: function(e) {
      var server = this.model.get('server');
      var message = $(e.currentTarget).val();

      if (e.charCode == 13) {
        $(e.currentTarget).val("");
        Komanda.vent.trigger(server + ':send', {
          target: this.model.get('channel'),
          message: message
        });
      }
    }
  });

});
