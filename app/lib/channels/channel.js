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
      uuid: uuid.v4()
    },

    initialize: function() {
      // ... 
    },

  });

  return channel;
});
