define([
  "app",
  'underscore',
  'lib/channels/channels',
  'lib/channels/channel',
  'lib/channels/channel-view',
  'lib/channels/channels-view',
  "hbs!templates/message",
  "hbs!templates/names",
  "moment"
], function(Komanda, _, Channels, Channel, ChannelView, ChannelsView, Message, NamesView, moment) {

  var Client = function(session) {
    var self = this;

    self.irc = window.requireNode('irc');
    self.options = session.attributes;
    self.nick = session.attributes.nick;
    self.socket = null;
    self.session = session;
    self.session.set("channels", []);
    self.topics = {};

    self.binded = false;

    self.channels = new Channels();

    self.channel = new Channel();
    self.region = new Backbone.Marionette.Region({ el: '#sidebar'});

    self.channelsView = new ChannelsView({
      collection: self.channels,
      model: self.channel
    });

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

    Komanda.vent.on(self.options.uuid + ':send', function(data) {
      var data = {
        nick: self.nick,
        to: data.target,
        text: data.message,
        timestamp: moment().format('MM/DD/YY hh:mm:ss')
      };

      var channel = $('div.channel[data-server-id="'+self.options.uuid+'"][data-name="'+data.to+'"] div.messages');

      if (channel.length > 0) {
        var html = Message(data);
        channel.append(html);
        var objDiv = channel.get(0);
        objDiv.scrollTop = objDiv.scrollHeight;
      }

      self.socket.say(data.to, data.text);
    });

    Komanda.vent.on('get:channel:list', function() {
      var channelNames = _.map(self.channels.models, function(m) {
        return m.get('channel');
      });

    });

    self.socket.addListener('message', function(nick, to, text, message) {

      var data = {
        nick: nick,
        to: to,
        text: text,
        message: message,
        timestamp: moment().format('MM/DD/YY hh:mm:ss')
      };

      if (text.match(self.nick)) {
        data.highlight = true;
      }

      var channel = $('div.channel[data-server-id="'+self.options.uuid+'"][data-name="'+to+'"] div.messages');

      if (channel.length > 0) {
        var html = Message(data);
        channel.append(html);
        var objDiv = channel.get(0);
        objDiv.scrollTop = objDiv.scrollHeight;

        if (Komanda.current.channel !== to) {
          var server = self.options.uuid;

          if (Komanda.store.hasOwnProperty(server)) {
            Komanda.store[server][to] = true;
          } else {
            Komanda.store[server] = {};
            Komanda.store[server][to] = true;
          }

         $('li.channel-item[data-server-id="'+server+'"][data-name="'+to+'"] div.status').addClass('new-messages');
        }
      }

      // Komanda.window.setBadgeLabel(Komanda.message_count++);

      Komanda.vent.trigger('message', data);
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

      if (self.topics.hasOwnProperty(self.options.uuid)) {
        if (self.topics[self.options.uuid].hasOwnProperty(channel)) {
          var topic = self.topics[self.options.uuid][channel];
          if (topic) channelTopic = topic;
        }
      }

      var data = {
        topic: channelTopic,
        channel: channel,
        names: names,
        server: self.options.uuid,
        name: self.options.name
      };

      if (channel) {
        var c = new Channel({channel: channel});
        c.set(data);
        self.channels.add(c)

        Komanda.vent.trigger('names', data);
        Komanda.vent.trigger('channel/join', c, data);

        var view = new ChannelView({
          model: c
        });

        var html = self.channelsView.render().el;

        var selector = $('#sidebar div.session[data-id="'+self.options.uuid+'"]');
        if (selector.find('.channel-list').length > 0) {
          selector.find('.channel-list').replaceWith(self.channelsView.render().el);
        } else {
          selector.append(self.channelsView.render().el);
        }

        $('.channel-holder').append(view.render().el);

        var chan = $('div.channel[data-server-id="'+self.options.uuid+'"][data-name="'+channel+'"] div.messages');
        $('#content .channel').hide();
        chan.parent('.channel').show();

        Komanda.current.channel = channel;
        Komanda.current.server = self.options.uuid;
        $('li.channel-item').removeClass('selected');
        selector.find('li.channel-item[data-name="'+channel+'"]').addClass('selected');
      }
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

      if (chan) {
        if (!self.me(nick)) {
          var names = chan.get('names');
          names[nick] = "";

          var d = chan.attributes;
          d.names = names;
          chan.set(d);
          self.updateNames(chan);
        }
      }

      self.channelsView.render();

      self.addMessage(channel, nick + " has joined the room.");

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
        var d = chan.attributes;
        chan.set(d);

        Komanda.vent.trigger('topic', data);
      }

    });

    self.socket.addListener('error', function(message) {

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

      if (self.me(oldnick)) {
        self.nick = newnick;
      }

      for (var i = 0; i < channels.length; i += 1) {
        var chan = self.findChannel(channels[i]);
        var names = chan.get('names');

        if (_.has(names, oldnick)) {
          var value = names[oldnick];
          var update = _.omit(names, oldnick);
          update[newnick] = value;

          var d = chan.attributes;
          d.names = update;
          chan.set(d);
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

      self.addMessage(channel, nick + " has left the room. " + (reason ? "["+reason+"]" : "") + "");

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

  Client.prototype.updateNames = function(channel) {
    var self = this;

    if (channel) {
      var names = channel.get('names')

      var html = NamesView({
        names: names
      });

      $('#content .channel[data-server-id="'+self.options.uuid+'"][data-name="'+channel.get("channel")+'"] .names').replaceWith(html);
    }

    self.channelsView.render();
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

          var d = chan.attributes;
          d.names = names;
          chan.set(d);
          self.updateNames(chan);
        }
      }


    } else {

      for (var i = 0; i < channel.length; i += 1) {
        var chans = self.findChannel(channel[i]);

        if (chans) {
          var namesd = _.omit(chans.get('names'), nick);

          var dd = chans.attributes;
          dd.names = namesd;
          chans.set(dd);
          self.updateNames(chans);
        }
      }
    }
  };

  Client.prototype.findChannel = function(channel) {
    var self = this;

    var chan = self.channels.get(channel);
    return chan;
  };

  Client.prototype.me = function(nick) {
    var self = this;

    if (nick === self.nick) return true;
    return false;
  };


  Client.prototype.addMessage = function(channel, message) {
    var self = this;
    var server = self.options.uuid;

    var chan = $('div.channel[data-server-id="'+server+'"][data-name="'+channel+'"] div.messages');

    if (chan.length > 0) {
      var html = Message({
        text: message,
        timestamp: moment().format('MM/DD/YY hh:mm:ss')
      });

      chan.append(html);

      var objDiv = chan.get(0);
      objDiv.scrollTop = objDiv.scrollHeight;
    }

  };

  return Client;
});
