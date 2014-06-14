define([
  'backbone',
  'uuid'
], function(Backbone, uuid) {

  var Session = Backbone.Model.extend({
    idAttribute: 'uuid',

    defaults: {
      connectOnStart: false,
      name: "Freenode",
      server: "irc.freenode.net",
      nick: "komanda",
      userName: 'komanda',
      realName: 'The Komanda IRC Client',
      port: 6667,
      debug: false,
      showErrors: false,
      autoRejoin: false,
      autoConnect: false,
      channels: [
        "#komanda"
      ],
      retryCount: 20,
      retryDelay: 5000,
      secure: false,
      selfSigned: false,
      certExpired: false,
      floodProtection: false,
      floodProtectionDelay: 1000,
      sasl: false,
      stripColors: true,
      channelPrefixes: "&#",
      messageSplit: 512,
      connectionOpen: false
    },

    initialize: function () {
      if (!this.uuid) this.uuid = uuid.v4();
    }

  });

  return Session;

});
