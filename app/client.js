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
    this.irc = window.requireNode('irc');
    this.options = session.attributes;
    this.nick = session.attributes.nick;
    this.socket = null;
    this.session = session;
    this.session.set("channels", []);
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
      self.channels.fetch({reset: true});
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

      var channel = $('div.channel[data-server-id="'+self.options.uuid+'"][data-name="'+to+'"] div.messages');

      if (channel.length > 0) {
        var html = Message(data);
        channel.append(html);
        var objDiv = channel.get(0);
        objDiv.scrollTop = objDiv.scrollHeight;
      }


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
        channel: channel.toLowerCase(),
        names: names,
        server: self.options.uuid,
        name: self.options.name
      };

      if (channel) {
        var c = new Channel({channel: channel.toLowerCase()});
        c.set(data);

        self.channels.add(c)

        Komanda.vent.trigger('names', data);
        Komanda.vent.trigger('channel/join', c, data);

        var view = new ChannelView({
          model: c
        });

        var channelsView = new ChannelsView({
          collection: self.channels
        });

        if (!Komanda.store.hasOwnProperty(self.options.uuid)) {
          Komanda.store[self.options.uuid] = {};
        }

        if (!Komanda.store[self.options.uuid].hasOwnProperty('views')) {
          Komanda.store[self.options.uuid].views = {};
        }

        Komanda.store[self.options.uuid].views[channel] = {
          view: view,
          model: c
        };

        var html = channelsView.render().el;

        var selector = $('#sidebar div.session[data-id="'+self.options.uuid+'"]');
        if (selector.find('.channel-list').length > 0) {
          selector.find('.channel-list').replaceWith(channelsView.render().el);
        } else {
          selector.append(channelsView.render().el);
        }

        $('.channel-holder').append(view.render().el);

        var chan = $('div.channel[data-server-id="'+self.options.uuid+'"][data-name="'+channel.toLowerCase()+'"] div.messages');
        $('#content .channel').hide();
        chan.parent('.channel').show();

        if (!Komanda.store.hasOwnProperty(self.options.uuid)) Komanda.store[self.options.uuid] = {};
        Komanda.store[self.options.uuid].current_channel = channel.toLowerCase();

        selector.find('li.channel-item[data-name="'+channel.toLowerCase()+'"]').addClass('selected');
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
          chan.save(null);
          chan.trigger('change');
        }
      }

      Komanda.vent.trigger('join', data);
    });

    self.socket.addListener('topic', function(channel, topic, nick, message) {

      var data = {
        channel: channel.toLowerCase(),
        nick: nick,
        topic: topic,
        message: message,
        server: self.options.uuid,
        name: self.options.name
      };

      if (!self.topics.hasOwnProperty(self.options.uuid)) {
        self.topics[self.options.uuid] = {};
      }

      self.topics[data.server][channel.toLowerCase()] = data;

      var chan = self.findChannel(channel.toLowerCase());

      if (chan) {
        var d = chan.attributes;
        chan.set(d);

        chan.save(null);
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
          chan.set(d).save(null);
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

    console.log("REMOVE USER", nick, channel);

    var callback = function() {
      var server = self.options.uuid;

      if (Komanda.store.hasOwnProperty(server)) {
        if (Komanda.store[server].hasOwnProperty('current_channel')) {
          $('li.channel-item').removeClass('selected');
          $('li.channel-item[data-server-id="'+server+'"][data-name="'+Komanda.store[server].current_channel+'"]').addClass('selected');
        }
      }

      if (Komanda.store[server].views.hasOwnProperty(channel)) {
        var names = Komanda.store[server].views[channel].view.model.get('names'); 
        console.log("BEFORE:", names);
        var html = NamesView({
          names: names
        });

        console.log(html);
        $('#content .channel[data-server-id="'+server+'"][data-name="'+channel+'"] .names').replaceWith(html);
        console.log("AFTER:", names);
      }
    };

    if (typeof channel === "string") {
      var chan = self.findChannel(channel);

      if (chan) {

        if (self.me(nick)) {
          chan.destroy();
        } else {

          console.log('NAMES BEFORE DUDE::', chan.get('names'));
          var names = _.omit(chan.get('names'), nick);

          console.log('NAMES DUDE:', names);

          var d = chan.attributes;
          d.names = names;
          chan.save(d, {
            success: function() {
              callback();
            },
            wait: true
          });
          chan.trigger('change');
        }
      }


    } else {

      for (var i = 0; i < channel.length; i += 1) {
        var chans = self.findChannel(channel[i]);

        if (chans) {
          var namesd = _.omit(chans.get('names'), nick);

          var dd = chans.attributes;
          dd.names = namesd;
          chans.save(dd, {
            success: function() {
              callback();
            },
            wait: true
          });

          chans.trigger('change');
        }
      }
    }


    
  };

  Client.prototype.findChannel = function(channel) {
    var self = this;
    var item = Komanda.store[self.options.uuid]

    self.channels.fetch({reset: true, wait: true});
    var chan = self.channels.get(channel);
    return chan;

    if (item) {
      if (item.hasOwnProperty('views')) {
        if (item.views.hasOwnProperty(channel)) {
          return item.views[channel].model
        }
      }
    } else {
      return self.channels.get({channel: channel});
    }
  };

  Client.prototype.me = function(nick) {
    var self = this;

    if (nick === self.nick) return true;
    return false;
  };

  return Client;
});
