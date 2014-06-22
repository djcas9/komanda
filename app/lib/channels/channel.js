define([
  "app",
  "underscore",
  "backbone-plugins",
  "uuid"
], function(Komanda, _, Backbone, uuid) {

  var channel = Backbone.Model.extend({
    idAttribute: 'channel',

    defaults: {
      channel: "",
      name: "",
      topic: "",
      names: "",
      server: "",
      uuid: uuid.v4(),
      selected: false,
      status: false,
      pm: false
    },

    initialize: function() {
      this.messages_id = '#messages-'+this.get('server')+'-'+(this.get('status') ? "status" : this.get('channel').replace(/\#+/, "komanda-"));
    },

    onClose: function() {
    },

    select: function() {
      console.log(this);
    },

    removeChannel: function(channel, server) {
      var self = this;
      var chan = $('li.channel-item[data-server-id="'+server+'"][data-name="'+channel+'"]');

      // if the channel is the selected one, move to proper endpoint
      if (chan.hasClass('selected')) {
        if (chan.prev('li.channel-item').length > 0) {
          chan.prev('li.channel-item').click();
        } else if (chan.next('li.channel-item').length > 0) {
          chan.next('li.channel-item').click();
        } else {
          chan.parents('.session').find('li.channel-item:first').click();
        }
      }

      chan.remove();
      $('.channel-holder div.channel[data-server-id="'+server+'"][data-name="'+channel+'"]').remove();
    }

  });

  return channel;
});
