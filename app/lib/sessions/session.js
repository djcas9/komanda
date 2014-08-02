define([
  "backbone",
  "underscore",
  "uuid"
], function(Backbone, _, uuid) {

  var Session = Backbone.Model.extend({
    idAttribute: "uuid",

    defaults: {
      connectOnStart: false,
      name: "Freenode",
      server: "irc.freenode.net",
      nick: "komanda",
      nickPassword: "",
      userName: "komanda",
      realName: "The Komanda IRC Client",
      port: 6667,
      debug: false,
      showErrors: false,
      autoRejoin: false,
      autoConnect: false,
      channels: [
        "#komanda"
      ],
      connectCommands: [],
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
      messageSplit: 512,
      connectionOpen: false
    },

    initialize: function () {
      if (!this.uuid) this.uuid = uuid.v4();
    },

    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === "object") {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      if(!options) {
        options = {};
      }

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      attrs = this.convert(attrs);

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes;
      prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        if (unset) {
          delete current[attr];
        } else {
          current[attr] = val;
        }
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, length = changes.length; i < length; i++) {
          this.trigger("change:" + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there"s a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger("change", this, options);
        }
      }
      this._pending = false;
      this._changing = false;

      return this;
    },

    convert: function(data) {
       if (data.hasOwnProperty("channels")) {
         if (typeof data.channels === "string") {
           data.channels = data.channels.split(",");
         }
       }

       if (data.hasOwnProperty("connectCommands")) {
         if (typeof data.connectCommands === "string") {
           data.connectCommands = data.connectCommands.replace(/\r/g, "").split("\n");
         }
       }

       return data;
    },


  });

  return Session;

});
