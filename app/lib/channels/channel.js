define([
  "app",
  "backbone-plugins",
  "uuid"
], function(Komanda, Backbone, uuid) {

  var channel = Backbone.NestedModel.extend({
    idAttribute: 'channel',

    defaults: {
      channel: "",
      name: "",
      topic: "",
      names: "",
      server: "",
      uuid: uuid.v4(),
      selected: false,
      status: false
    },

    initialize: function() {
      this._modelBinder = new Backbone.ModelBinder();
    },

    onClose: function() {
      this._modelBinder.unbind();
    },

    select: function() {
      console.log(this);
    },

    removeChannel: function(channel, server) {
      var self = this; 
      $('li.channel-item[data-server-id="'+server+'"][data-name="'+channel+'"]').remove();
      $('.channel-holder div.channel[data-server-id="'+server+'"][data-name="'+channel+'"]').remove();
    }

  });

  return channel;
});
