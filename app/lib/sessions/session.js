define([
  'backbone-plugins',
  'uuid'
], function(Backbone, uuid) {

  var Session = Backbone.NestedModel.extend({
    idAttribute: 'uuid',
    _modelBinder: undefined,

    defaults: {
      name: "Freenode",
      server: "irc.freenode.net",
      nick: "komanda",
      userName: 'komanda',
      realName: 'The Komanda IRC Client',
      port: 6667,
      debug: false,
      showErrors: false,
      autoRejoin: true,
      autoConnect: false,
      channels: [],
      retryCount: 20,
      retryDelay: 5000,
      secure: false,
      selfSigned: false,
      certExpired: false,
      floodProtection: false,
      floodProtectionDelay: 1000,
      sasl: false,
      stripColors: false,
      channelPrefixes: "&#",
      messageSplit: 512
    },

    validate: function (attrs) {
    },

    initialize: function () {
      this.uuid = uuid.v4();
    },

    onClose: function() {
    }

  });

  return Session;

});
