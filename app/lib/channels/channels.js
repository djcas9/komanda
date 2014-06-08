define([
  "app",
  "backbone-plugins",
  "lib/channels/channel"
], function(Komanda, Backbone, channel) {

  var channels = Backbone.Collection.extend({
    // localStorage: Komanda.store.channels,
    localStorage: new Backbone.LocalStorage('komanda.channels'),
    store : 'channels',
    model: channel,

    initialize: function() {
      console.log(Komanda.store.channels);
    },

  });

  return channels;
});
