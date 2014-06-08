define([
  "app",
  'underscore',
  'lib/channels/channels',
  'lib/channels/channel'
], function(Komanda, _, Channels, Channel) {

  var Client = function(session) {
    this.irc = window.requireNode('irc');
    this.options = session.attributes;
    this.nick = session.attributes.nick;
    this.socket = null;
    this.session = session;
    this.topics = {};
    this.binded = false;

    this.channels = new Channels();

    this.channels.fetch({reset: true});

    return this;
  };

  Client.prototype.connect = function(callback) {
    var self = this;
    self.socket = new this.irc.Client(this.options.server, this.options.nick, this.options);
    self.socket.connect(10, function() {
      if (callback && typeof callback === "function") callback(self);
      Komanda.vent.trigger('connect', {
        server: self.options.uuid,
        name: self.options.name
      });
    });
  };

  Client.prototype.disconnect = function() {
    var self = this;
    self.socket.disconnect("Bye", function() {
      Komanda.vent.trigger('disconnect', {
        server: self.options.uuid,
        name: self.options.name
      });
    });
  };

  Client.prototype.bind = function() {
    var self = this;

    if (self.binded) return;
    self.binded = true;

    Komanda.vent.on('get:channel:list', function() {
      self.channels.fetch({reset: true});
      var channelNames = _.map(self.channels.models, function(m) {
        return m.get('channel');
      });

      console.log(self.session.server, channelNames);
    });

    self.socket.addListener('registered', function(message) {
      Komanda.vent.trigger('registered', {
        message: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener('motd', function(message) {
      Komanda.vent.trigger('motd', {
        message: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener('names', function(channel, names) {
      var channelTopic = "";

      if (self.topics.hasOwnProperty(self.options.server)) {
        if (self.topics[self.options.server].hasOwnProperty(self.options.channel)) {
          var topic = self.topics[self.options.server][self.options.channel];
          if (topic) channelTopic = topic;
        }
      }

      var data = {
        topic: channelTopic,
        channel: channel.toLowerCase(),
        names: names,
        server: self.options.uuid,
        name: self.options.name
      };

      var c = new Channel({channel: channel.toLowerCase()});
      c.set(data);
      self.channels.add(c);
      c.save();

      console.log(self.channels.length);

      Komanda.vent.trigger('names', data);
      Komanda.vent.trigger('channel/join', c, data);
    });

    self.socket.addListener('join', function(channel, nick, message) {
      var data = {
        channel: channel,
        nick: nick,
        message: message,
        server: self.options.uuid,
        name: self.options.name
      };

      var chan = self.findChannel(channel);

      alert(channel + "" + nick + "" + self.nick)
      console.log(data);

      if (chan) {
        if (!self.me(nick)) {
          var names = chan.get('names');
          names[nick] = "";
          chan.set({
            names: names
          });
          chan.save();
        };
      }

      Komanda.vent.trigger('join', data);
    });

    self.socket.addListener('topic', function(channel, topic, nick, message) {

      var data = {
        channel: channel,
        nick: nick,
        topic: topic,
        message: message,
        server: self.options.uuid,
        name: self.options.name
      };

      if (!self.topics.hasOwnProperty(self.options.uuid)) {
        self.topics[self.options.uuid] = {};
      }

      self.topics[data.server][channel] = data;

      var chan = self.findChannel(channel);

      if (chan) {
        chan.set({
          topic: data
        });

        chan.save();
      }

      Komanda.vent.trigger('topic', {
        channel: channel,
        nick: nick,
        topic: topic,
        message: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener('error', function(message) {
      window.console.error(message);

      Komanda.vent.trigger('error', {
        error: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener('raw', function(message) {
      // Komanda.vent.trigger('raw', {
        // message: message,
        // server: self.options.uuid,
        // name: self.options.name
      // });
    });

    self.socket.addListener('nick', function(oldnick, newnick, channels, message) {
      var data = {
        oldnick: oldnick,
        newnick: newnick,
        channels: channels,
        message: message,
        server: self.options.uuid,
        name: self.options.name
      };

      console.log(data);

      if (self.me(nick)) {
        self.nick = newnick;
      }

      for (var i = 0; i < channels.length; i += 1) {
        var chan = self.findChannel(channels[i]);
        var names = chan.get('names');

        if (_.has(names, oldnick)) {
          var value = names[oldnick];
          var update = _.omit(names, oldnick);
          update[newnick] = value;
          chan.set({names: update}).save();
        }
      }

      Komanda.vent.trigger('nick', data);
    });

    self.socket.addListener('part', function(channel, nick, reason, message) {

      var data = {
        channel: channel,
        nick: nick,
        reason: reason,
        message: message
      };

      self.removeUser(channel, nick);
      Komanda.vent.trigger('part', data);
    });

    self.socket.addListener('kick', function(channel, nick, by, reason, message) {

      var data = {
        channel: channel,
        nick: nick,
        by: by,
        reason: reason,
        message: message
      };

      self.removeUser(channel, nick);
      Komanda.vent.trigger('kick', data);
    });

    self.socket.addListener('quit', function(nick, reason, channels, message) {

      var data = {
        channels: channels,
        nick: nick,
        reason: reason,
        message: message
      };

      self.removeUser(channels, nick);
      Komanda.vent.trigger('quit', data);
    });

    self.socket.addListener('kill', function(nick, reason, channels, message) {

      var data = {
        channels: channels,
        nick: nick,
        reason: reason,
        message: message
      };

      self.removeUser(channels, nick);
      Komanda.vent.trigger('kill', data);
    });

  };

  Client.prototype.removeUser = function(channel, nick) {
    var self = this;

    if (typeof channel === "string") {
      var chan = self.findChannel(channel);

      if (chan) {

        if (self.me(nick)) {
          chan.destroy();
        } else {
          var names = _.omit(chan.get('names'), nick);
          chan.set({
            names: names
          });
          chan.save();
        }
      };

    } else {

      for (var i = 0; i < channel.length; i += 1) {
        var chan = self.findChannel(channel[i]);
        console.log(channel[i], chan);
        if (chan) {
          var names = _.omit(chan.get('names'), nick);
          chan.set({
            names: names
          });
          chan.save();
        };
      }
    }

  };

  Client.prototype.findChannel = function(channel) {
    var self = this;
    self.channels.fetch({reset: true});
    var chan = self.channels.get(channel);
    return chan;
  };

  Client.prototype.me = function(nick) {
    var self = this;

    if (nick === self.nick) return true;
    return false;
  };

  return Client;
});
