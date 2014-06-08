define([
  "app",
  "backbone-plugins",
  "lib/channels/channel"
], function(Komanda, Backbone, channel) {

  var channels = Backbone.Collection.extend({
    model: channel,
    localStorage: new Backbone.LocalStorage('komanda.channels'),


    initialize: function() {
    }

  });

  return channels;
});
