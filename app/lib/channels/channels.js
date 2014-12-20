define([
  "app",
  "backbone-plugins",
  "lib/channels/channel"
], function(Komanda, Backbone, channel) {

  var channels = Backbone.Collection.extend({
    model: channel,
    // localStorage: new Backbone.LocalStorage('komanda.channels'),


    initialize: function() {},

    swapChannels: function (firstChannelIndex, secondChannelIndex) {
      var tempChannel = this.models[firstChannelIndex];

      this.models[firstChannelIndex] = this.models[secondChannelIndex];
      this.models[secondChannelIndex] = tempChannel;

      return this;
    }

  });

  return channels;
});
