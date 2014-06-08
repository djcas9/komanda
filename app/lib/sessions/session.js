define([
  'backbone-plugins',
  'uuid'
], function(Backbone, uuid) {

  var Session = Backbone.Model.extend({
    localStorage: new Backbone.LocalStorage('komanda.sessions'),
    store : 'sessions',
    idAttribute: 'name',

    defaults: {
      name: "Default",
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
      secure: false,
      selfSigned: false,
      certExpired: false,
      floodProtection: false,
      floodProtectionDelay: 1000,
      sasl: false,
      stripColors: false,
      channelPrefixes: "&#",
      messageSplit: 512,
      uuid: uuid.v4()
    },

    validate: function (attrs) {
    },

    initialize: function () {
    }

  });

  return Session;

});
