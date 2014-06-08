define([
  'backbone-plugins',
  'uuid'
], function(Backbone, uuid) {

  var Session = Backbone.NestedModel.extend({
    idAttribute: 'name',
    _modelBinder: undefined,

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
      this._modelBinder = new Backbone.ModelBinder();
    },

    onClose: function() {
      this._modelBinder.unbind();
    }

  });

  return Session;

});
