define([
  "app",
  "underscore",
  "helpers",
  "lib/channels/channels",
  "lib/channels/channel",
  "lib/channels/channel-view",
  "lib/channels/channels-view",
  "hbs!templates/message",
  "hbs!templates/notice",
  "hbs!templates/names",
  "hbs!templates/popup",
  "moment",
  "uuid"
], function(Komanda, _, Helpers, Channels, Channel, ChannelView, ChannelsView, Message, Notice, NamesView, Popup, moment, uuid) {

  var Client = function(session) {
    var self = this;

    self.irc = window.requireNode("irc");
    self.options = session.attributes;
    self.options.stripColors = false;
    self.nick = session.attributes.nick;
    self.socket = null;

    self.session = session;

    self.retryCount = 300;
    self.retryCountCurrent = 0;
    self.retryFunction = null;
    self.attemptingReconnect = false;
    self.allowReconnect = true;

    self.topics = {};

    self.binded = false;

    self.channels = new Channels();
    self.channel = new Channel();

    self.channelsView = new ChannelsView({
      collection: self.channels,
      model: self.channel
    });

    self.views = [];

    $(".channel-item[data-name=\"Status\"]").removeClass("selected");
    $(".channel").hide();

    var c = new Channel({
      channel: "Status",
      topic: false,
      names: {},
      name: "Server Status",
      server: self.options.uuid,
      status: true,
      pm: false
    });

    self.channels.add(c);

    var view = new ChannelView({
      model: c
    });

    Komanda.current = {
      server: self.options.uuid,
      channel: "Status"
    };

    $(".channel-holder").append(view.render().el);
    var selector = $("#sidebar div.session[data-id=\"" + self.options.uuid + "\"]");
    if (selector.find(".channel-list").length > 0) {
      selector.find(".channel-list").replaceWith(self.channelsView.render().el);
    } else {
      selector.append(self.channelsView.render().el);
    }

    self._whois = {};

    return this;
  };

  Client.prototype.isConnected = function() {
    var self = this;

    if (self.socket && self.socket.conn && window.navigator.onLine &&
        self.socket.conn.readable && self.socket.conn.writable) {
      self.session.set("connectionOpen", true);
      return true;
    }

    self.clearViews();
    Komanda.vent.trigger(self.options.uuid + ":disconnect");

    if (self.socket && self.socket.conn) {
      self.socket.conn.end();
    }

    self.session.set("connectionOpen", false);

    if (Komanda.current.channel !== "Status") {
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").click();
    }

    return false;
  };

  Client.prototype.connect = function(callback) {
    var self = this;

    var options = _.extend({}, this.options);
    options.channels = [];
    self.socket = new this.irc.Client(this.options.server, this.options.nick, options);

    self.bind();

    self.socket.connect(options.retryCount || 50, function() {
      if (_.isFunction(callback)) {
        callback(self);
      }

      self.session.set("connectionOpen", true);

      if (Komanda.connections.hasOwnProperty(self.options.uuid)) {
        Komanda.connections[self.options.uuid].hasClient = true;
      }

      // self.bindReconnect();

      Komanda.vent.trigger("connect", {
        server: self.options.uuid,
        name: self.options.name
      });
    });
  };

  Client.prototype.clearViews = function() {
    var self = this;
    _.each(self.views, function(v) {
      v.close();
    });

    $(".channel-item[data-server-id=\""+self.options.uuid+"\"][data-name!=\"Status\"]").remove();
  };

  Client.prototype.disconnect = function(callback) {
    var self = this;

    self.attemptingReconnect = false;

    self.socket.disconnect("Bye", function() {
      self.session.set("connectionOpen", false);

      self.clearViews();
      self.socket.conn.end();

      if (_.isFunction(callback)) {
        callback(self);
      }

      // Komanda.vent.trigger("disconnect", {
        // server: self.options.uuid,
        // name: self.options.name
      // });
    });
  };

  Client.prototype.onMode = function(channel, by, mode, argument, message, added) {
    var self = this;

    var modeToPrefix = {
      "q": "~",
      "a": "&",
      "o": "@",
      "h": "%",
      "v": "+"
    };
    var modePriority = { "q": 5, "a": 4, "o": 3, "h": 2, "v": 1 };

    /*
     * Note for future: Is there a way to do this without sending another names
     * command and ensure we get the correct data afterwards? It is possible to
     * set both +v and +o on someone, but NAMES does not (appear to) show both
     * prefixes.
     */
    // set user to op/halfop/etc.
    if(argument && "qaohv".indexOf(mode) > -1) {
      self.socket.send("NAMES", channel);
    } else if(argument) {
      // TODO: other cases here. what are these?
    } else {
      /*
       * TODO: Do this without sending another mode command.
       */
      self.socket.send("MODE", channel);
    }
  };

  Client.prototype.processWhois = function(message) {
    var self = this;

    var target = message.args[1].toLowerCase();
    // return if called out of turn
    if (!self._whois[target]) {
      return;
    }
    var data = message.args.slice(2);

    switch (message.command) {
      // away
      case "rpl_away":
        if (data.length > 1) {
          self._whois[target].away = data[1];
        } else {
          self._whois[target].away = data[0];
        }
        break;
      // user info
      case "rpl_whoisuser":
        self._whois[target].nick = message.args[1];
        self._whois[target].user = data[0];
        self._whois[target].host = data[1];
        self._whois[target].realName = data[3];
        break;
      // channels
      case "rpl_whoischannels":
        self._whois[target].channels = data[0].trim().split(" ");
        break;
      // server info
      case "rpl_whoisserver":
        self._whois[target].server = {
          hostName: data[0],
          location: data[1]
        };
        break;
      // idle info
      case "rpl_whoisidle":
        self._whois[target].idleDuration = moment.duration(parseInt(data[0], 10), "seconds");
        self._whois[target].signOnTime = moment(1000 * parseInt(data[1], 10));
        break;
      // using secure connection
      case "671":
        if (data[0] === "is using a secure connection") {
          self._whois[target].ssl = true;
        }
        break;
      // logged in as...
      case "330":
        self._whois[target].account = {
          authName: data[0],
          info: data[1]
        };
        break;
      // RPL_WHOIS(SVCMSG|HELPOPSERVICE)
      case "310":
        self._whois[target].service = data[0];
        break;
      // on some servers, corresponds to client certificate
      case "276":
        self._whois[target].cert = data[0];
        break;
      // oper
      case "rpl_whoisoperator":
        self._whois[target].oper = data[0];
        break;
      // we're done here, trigger whois with data we collated
      case "rpl_endofwhois":
        Komanda.vent.trigger(self.options.uuid + ":whois", self._whois[target]);
        delete self._whois[target];
        break;
      // don't know what to do with these yet, so do nothing!
      default:
        //console.log(message.command, data);
        break;
    }
  };

  Client.prototype.bindReconnect = function() {
    var self = this;

    self.reconnectFunction = function() {

      if (!self.allowReconnect) {
        return;
      }

      if (!self.isConnected()) {

        if (self.socket && self.socket.conn) {

          self.socket.conn.requestedDisconnect = false;
          $(".channel-item[data-name!=\"Status\"]").remove();

          Komanda.vent.trigger(self.options.uuid + ":disconnect");
          self.socket.conn.end();
          self.clearViews();

          if (self.retryCountCurrent < self.retryCount) {
            Komanda.connections[self.options.uuid].inReconnect = true;

            if (!self.attemptingReconnect && self.allowReconnect) {
              self.retryCountCurrent++;
              self.socket.emit("connection:reconnect", self.retryCountCurrent);

              self.socket.connect(function() {
                clearInterval(self.reconnectCheck);
                self.retryCountCurrent = 0;
                self.bindReconnect();
                // we need to rejoin channels here
              });

              self.attemptingReconnect = true;
            }

          } else {
            clearInterval(self.reconnectCheck);
            Komanda.connections[self.options.uuid].inReconnect = false;
            self.socket.emit("connection:abort", self.retryCount, self.retryCountCurrent);
          }
        }

      } else if (!window.navigator.onLine) {
        Komanda.vent.trigger(self.options.uuid + ":disconnect");
        self.socket.conn.end();

        self.session.set("connectionOpen", false);
        self.clearViews();
      }
    };

    if (self.reconnectCheck) {
      clearInterval(self.reconnectCheck);
    }

    if (self.allowReconnect) {
      self.reconnectCheck = setInterval(self.reconnectFunction, 10000);
    }
  };

  Client.prototype.bind = function() {
    var self = this;

    if (self.binded) {
      return;
    }

    self.binded = true;

    self.sendPingPong = setInterval(function() {
      if (self.isConnected()) {
        if (self.socket) {
          // this is hacky
          self.socket.send("");
        }
      }
    }, 10000);

    self.socket.addListener("ping", function() {});
    self.socket.addListener("pong", function() {});

    self.offlineCheckFunction = function() {
      self.isConnected();
    };

    self.offlineCheck = setInterval(self.offlineCheckFunction, 4000);

    Komanda.vent.on(self.options.uuid + ":disconnect", function(callback, otherback) {
      if (otherback && typeof otherback === "function") {
        otherback(self);
      }
      self.disconnect(callback);
    });

    Komanda.vent.on("disconnect", function() {
      self.session.set("connectionOpen", false);
      // self.bindReconnect();
    });

    Komanda.vent.on("connect", function() {
      self.session.set("connectionOpen", true);
      clearInterval(self.reconnectCheck);

      if (self.session.get("nickPassword")) {
        var password = self.session.get("nickPassword");

        if (password.length !== 0) {
          self.socket.send("nickserv", "identify", password);
        }
      }

      // execute commands called on connection
      _.each(self.session.get("connectCommands"), function(cmd) {
        self.socket.send.apply(self.socket, cmd.split(" "));
      });

      // self.bindReconnect();
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").removeClass("offline");
    });

    self.socket.addListener("connection:end", function() {});

    self.socket.addListener("connection:abort", function(max, count) {
      self.statusMessage("Komanda Notice: Reconnect has been aborted");
    });

    self.socket.addListener("connection:timeout", function() {});

    self.socket.addListener("connection:error", function(error) {
      self.attemptingReconnect = false;

      var message = "Komanda Error: " + (error.hasOwnProperty("message") ? error.message : "Unknown Error");

      if (error.code === "EADDRNOTAVAIL") {
        message = "Komanda Error: You have lost connection to the internet. Komanda will attempt to reconnect.";
      }

      if (error.code === "ENOTFOUND") {
        message = "Komanda Error: You are not connected to the internet. Komanda will attempt to reconnect.";
      }

      if( error.code == "EPROTO"){
        message = "Komanda Error: You have connected to the server with mismatching protocol. Please disable/enable SSL based on the server.";
      }
      self.statusMessage(message);
    });

    self.socket.addListener("connection:close", function() {
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").addClass("offline");
    });

    self.socket.addListener("connection:reconnect", function(retry) {
      self.statusMessage("Komanda Notice: Attempting To Reconnect. (" + self.retryCountCurrent + "/" + self.retryCount + ")");
    });

    self.socket.addListener("connection:disconnect", function(retry) {
      self.attemptingReconnect = false;
      self.session.set("connectionOpen", false);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").addClass("offline");
    });

    self.socket.addListener("connection:connect", function() {
      self.session.set("connectionOpen", true);
      // self.bindReconnect();
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").removeClass("offline");
    });

    self.socket.addListener("names", function(channel, names) {
      /*
       * If the channel already exists, that means we got another NAMES event as
       * a result of someone changing modes. Therefore, we simply update the
       * view and return.
       */
      if(channel && self.findChannel(channel)) {
        chan = self.findChannel(channel);
        chan.set("names", names);
        self.updateNames(chan);
        return;
      }
      var channelTopic = "";

      if (self.topics.hasOwnProperty(self.options.uuid)) {
        if (self.topics[self.options.uuid].hasOwnProperty(channel)) {
          var topic = self.topics[self.options.uuid][channel];

          if (topic) {
            channelTopic = topic;
          }

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
        var c = new Channel({
          channel: channel,
          server: self.options.uuid
        });

        c.set(data);

        self.channels.add(c);

        var view = new ChannelView({
          model: c
        });

        self.views.push(view);

        Komanda.vent.trigger("names", data);
        Komanda.vent.trigger("channel/join", c, data);

        var chan = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel + "\"]");

        if (chan.length > 0) return;

        $(".channel-holder").append(view.render().el);

        self.addMessage(channel, "Topic: " + (channelTopic.topic || "N/A"));
        if (channelTopic.nick && channelTopic.message && channelTopic.message.args[3]) {
          // node-irc passes the topic creation date/time as a unix timestamp in message.args[3]
          var topicTimestamp = moment.unix(parseInt(channelTopic.message.args[3])).format("MM/DD/YY hh:mm:ss");
          self.addMessage(channel, "Set by " + channelTopic.nick + " on " + topicTimestamp);
        }

        Komanda.vent.trigger(self.options.uuid + ":" + channel + ":topic", channelTopic.topic);
        $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel + "\"]").click();

        setTimeout(function() {
          Helpers.scrollUpdate(chan, true);
        }, 100);
      }
    });

    self.socket.addListener("join", function(channel, nick, message) {
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
          var names = chan.get("names");
          names[nick] = "";

          var d = chan.attributes;
          d.names = names;
          chan.set(d);
          self.updateNames(chan);
        }
      }

      self.channelsView.render();

      if (!Komanda.settings.get("display.hidejoinpart")) {
        self.addMessage(channel, nick + " [" + message.prefix + "] has joined the room.");
      }

      Komanda.vent.trigger("join", data);
    });

    self.socket.addListener("topic", function(channel, topic, nick, message) {

      var data = {
        channel: channel,
        nick: nick,
        topic: topic || "N/A",
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

        $(".channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel + "\"] .topic span.title").html(topic || "");
        self.addMessage(channel, "Topic: " + (topic || "N/A"));
        if (message.args[3]) {
          var topicTimestamp = moment.unix(parseInt(message.args[3])).format(Komanda.settings.get("display.timestamp"));
          self.addMessage(channel, "Set by " + nick + " on " + topicTimestamp);
        }

        Komanda.vent.trigger(self.options.uuid + ":" + channel + ":topic", data.topic);
        Komanda.vent.trigger("topic", data);
      }

    });

    Komanda.vent.on(self.options.uuid + ":part", function(channel) {
      var chan = self.findChannel(channel);

      if (chan) {
        if (chan.get("pm")) {
          self.removeAndCleanChannel(chan, self.options.uuid);
          Komanda.vent.trigger("channel/part", self.options.uuid, channel);
        } else {

          if (self.isConnected()) {
            self.socket.part(channel, "Bye!", function() {
              self.removeAndCleanChannel(chan, self.options.uuid);
              Komanda.vent.trigger("channel/part", self.options.uuid, channel);
            });
          } else {
            self.removeAndCleanChannel(chan, self.options.uuid);
            Komanda.vent.trigger("channel/part", self.options.uuid, channel);
          }

        }
      }

    });

    Komanda.vent.on(self.options.uuid + ":join", function(channel) {
      self.socket.join(channel, function() {
        // retrieve modes
        self.socket.send("MODE", channel.trim());
        // trigger actual join on screen
        Komanda.vent.trigger("channel/join", self.options.uuid, channel);
        $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel + "\"]").click();
      });
    });

    Komanda.vent.on(self.options.uuid + ":send", function(data) {
      var render = function(isNotice) {
        var dd = {
          nick: self.nick,
          to: data.target || "",
          text: data.message,
          server: self.options.uuid,
          uuid: uuid.v4()
        };

        if (isNotice) {
          var cmd = dd.text.split(" ");
          dd.text = cmd.slice(2).join(" ");
          dd.to = cmd[1];
          dd.sender = true;
          dd.toChannel = Channel.isChannel(data.target);
        }

        var channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + dd.to + "\"] div.messages");

        if (channel.length > 0) {
          var html = (isNotice) ? Notice(dd) : Message(dd);
          _.defer(function() {
            channel.append(html);
          });
        }

        if (!isNotice) {
          self.socket.say(dd.to, dd.text);
        }

        setTimeout(function() {
          Helpers.scrollUpdate(channel, true);
        }, 10);
      };

      if (data.message.trim()[0] === "/") {
        Komanda.command.handle(self, data, function(client, data, args) {
          // default, called when no matches
          client.socket.send.apply(client.socket, data.message.slice(1).split(" "));
        });
      } else {
        render();
      }
    });

    Komanda.vent.on(self.options.uuid + ":pm", function(nick) {
      self.buildPM(nick);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + nick + "\"]").click();
    });

    Komanda.vent.on(self.options.uuid + ":whois", function(data) {
      var msgData = [
        "*** WHOIS FOR USER: " + data.nick,
        "Hostmask:    " + data.user + "@" + data.host,
        "Real Name:   " + data.realName,
      ];
      if (data.channels) {
        msgData.push("Channels:    " + data.channels.join(", "));
      }
      msgData.push("Server:      " + data.server.hostName + " (" + data.server.location + ")");
      if (data.account) {
        msgData.push(data.account.info + " " + data.account.authName);
      }
      if (data.away) {
        msgData.push("Away:        " + data.away);
      }
      if (data.idleDuration) {
        var idleParts = [];
        if ((data.idleDuration.asHours() || 0) > 0) {
          idleParts.push((data.idleDuration.asHours() || 0) + "h");
        }
        if (data.idleDuration.minutes() > 0) {
          idleParts.push(data.idleDuration.minutes() + "m");
        }
        if (data.idleDuration.seconds() > 0) {
          idleParts.push(data.idleDuration.seconds() + "s");
        }
        msgData.push("Idle:        " + idleParts.join(" "));
        msgData.push("Signed On:   " + data.signOnTime.format("MMMM Do YYYY, hh:mm:ss A"));
      }
      if (data.ssl) {
        msgData.push("is using a secure connection");
      }
      if (data.cert) {
        msgData.push(data.cert);
      }
      if (data.oper) {
        msgData.push(data.oper);
      }
      if (data.service) {
        msgData.push(data.service);
      }
      _.each(msgData, function(msg) {
        self.addMessage(Komanda.current.channel, msg, true);
      });
    });

    self.socket.addListener("nickSet", function(nick) {
      self.nick = nick;
      self.session.set("nick", self.nick);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"] span.current-nick").html(self.nick);
    });

    self.socket.addListener("pm", function(nick, text, message) {});

    self.socket.addListener("channellist", function(channel_list) {
      // only do the first hundred until we have a window to handle them all,
      // so we don"t deal with freezing
      _.each(channel_list.slice(0, 100), function(channel) {
        var msg = channel.name + " (" + channel.users + ")";
        if (channel.topic) {
          msg += " || " + channel.topic;
        }
        self.statusMessage(msg);
      });
    });

    self.socket.addListener("notice", function(nick, to, text, message) {
      if (Channel.isChannel(to)) {
        self.sendMessage(nick, to, text, message, undefined, true);
      } else {
        // PM

        if (!nick) {
          // this is a server status message
          self.statusMessage(message.args.join(" "));
        } else {
          var isStatus = self.buildPM(nick);

          if (isStatus) {
            self.statusMessage(text);
          } else {
            self.sendMessage(nick, to, text, message, true, true);

            if (Komanda.Notification && Komanda.settings.get("notifications.highlight")) {
              var n = new Komanda.Notification("Notice From " + nick, {
                tag: "Komanda",
                body: "->" + nick + "<- " + text
              });

              n.onClick = function() {
                alert("word");
              };
            }
          }
        }
      }
    });

    // TODO: move to plugin
    var handleZNCBufferPlaybackTimestamp = function (context) {
      if (!context.channel) return;

      if (context.message.prefix === "***!znc@znc.in") {
        if (context.text === "Buffer Playback...") {
          context.channel.zncbuffer = true;
        }
        else if (context.text === "Playback Complete.") {
          delete context.channel.zncbuffer;
        }

        return;
      }

      if (context.channel.zncbuffer) {
        var timestamp = /^\[(\d{2}:\d{2}:\d{2})\]\s/.exec(context.text);

        if (timestamp) {
          context.text = context.text.split(" ").splice(1).join(" ");
          context.message.timestamp = moment(timestamp, "HH:mm:ss").valueOf();
        }
      }
    };

    self.socket.addListener("message", function(nick, to, text, message) {
      if (!message.timestamp) message.timestamp = Date.now();

      var context = {
        client: self,
        channel: self.findChannel(to),
        nick: nick,
        to: to,
        text: text,
        message: message,
        toChannel: Channel.isChannel(to)
      };

      handleZNCBufferPlaybackTimestamp(context);

      if (context.toChannel) {
        self.sendMessage(context.nick, context.to, context.text, context.message);
      } else {
        // PM
        var isStatus = self.buildPM(context.nick);

        if (isStatus) {
          self.statusMessage(context.text);
        } else {
          self.sendMessage(context.nick, context.to, context.text, context.message, true);

          if (Komanda.Notification && Komanda.settings.get("notifications.highlight")) {
            var n = new Komanda.Notification("Private Message From " + context.nick, {
              tag: "Komanda",
              body: "<" + context.nick + "> " + context.text
            });

            n.onClick = function() {
              alert("word");
            };
          }
        }
      }
    });

    self.socket.addListener("action", function(nick, to, text, message) {
      if (!message.timestamp) message.timestamp = Date.now();

      var context = {
        client: self,
        channel: self.findChannel(to),
        nick: nick,
        to: to,
        text: text,
        message: message,
        toChannel: Channel.isChannel(to)
      };

      handleZNCBufferPlaybackTimestamp(context);

      if (Channel.isChannel(to)) {
        self.sendMessage(context.nick, context.to, context.text, context.message, false, false, true);
      } else {
        // PM
        self.buildPM(context.nick);
        self.sendMessage(context.nick, context.to, context.text, context.message, true, false, true);

        if (Komanda.Notification && Komanda.settings.get("notifications.highlight")) {
          var n = new Komanda.Notification("Private Message From " + context.nick, {
            tag: "Komanda",
            body: context.nick + context.text
          });

          n.onClick = function() {
            alert("word");
          };
        }
      }
    });

    self.socket.addListener("registered", function(message) {
      Komanda.vent.trigger("registered", {
        message: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener("motd", function(message) {
      Komanda.vent.trigger("motd", {
        message: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });


    self.socket.addListener("error", function(message) {
      Komanda.vent.trigger("error", {
        error: message,
        server: self.options.uuid,
        name: self.options.name
      });
    });

    self.socket.addListener("+mode", function(channel, by, mode, argument, message) {
      self.onMode(channel, by, mode, argument, message, true);
    });
    self.socket.addListener("-mode", function(channel, by, mode, argument, message) {
      self.onMode(channel, by, mode, argument, message, false);
    });

    self.socket.addListener("raw", function(message) {
      var codes = [
        "001", "002", "003", "004", "005", "006", "007",
        "372", "375", "376", "377", "378", "221",
        "705",
        // errors
        "402", "404", "405", "406", "407", "408", "409", "411", "412", "413",
        "414", "415", "416", "421", "422", "423", "424", "431", "432", "433", "436", "437",
        "438", "439", "441", "442", "443", "444", "445", "446", "451", "461", "462", "463",
        "464", "465", "466", "467", "468", "471", "472", "473", "474", "475", "476", "477",
        "478", "481", "482", "483", "484", "485", "491", "501", "502", "511"
      ];
      var whoisCodes = [
        "276", "301", "307", "308", "309", "309", "310", "311", "312", "313", "316", "317",
        "318", "319", "320", "330", "335", "338", "378", "379", "615", "616",
        "617", "671", "689", "690"
      ];
      if (_.contains(whoisCodes, message.rawCommand)) {
        self.processWhois(message);
      } else if (message.rawCommand === "324") {
        // modes came in for a channel!
        var channel = message.args[1];
        var modes = message.args.slice(2).join(" ");
        self.findChannel(channel).set("modes", modes.trim());
      } else if (message.rawCommand === "401" || message.rawCommand === "403") {
        var chan = self.findChannel(message.args[1]);
        if (chan) {
          self.removeAndCleanChannel(chan, self.options.uuid);
        }
        var box = Helpers.limp.box(Popup, {
          title: "Error #" + message.rawCommand,
          content: message.args[2] + ": " + message.args[1],
          buttons: [
            {
              classes: "right",
              close: true,
              name: "OK"
            }
          ]
        }, {
          onOpen: function() {
            $(document).off("keypress");
          },
          afterDestroy: function() {
            $(document).on("keypress", function(e) {
              if (Komanda.current) {
                $("#content .channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel.get("channel") + "\"] input").focus();
              }
            });
          }
        });
        box.open();
      } else if (_.contains(codes, message.rawCommand) || message.commandType === "error") {
        if (self.me(message.args[0])) {
          message.args.shift();
        }

        self.statusMessage(message.args.join(" "));
      }
      // Komanda.vent.trigger("raw", {
      // message: message,
      // server: self.options.uuid,
      // name: self.options.name
      // });
    });

    self.socket.addListener("nick", function(oldnick, newnick, channels, message) {
      if (self.me(oldnick)) {
        self.nick = newnick;
        self.session.set("nick", self.nick);

        $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"] span.current-nick").html(self.nick);
      }

      _.each(self.channels.models, function(chan) {
        var names = chan.get("names");

        if (_.has(names, oldnick)) {
          var value = names[oldnick];
          var update = _.omit(names, oldnick);
          update[newnick] = value;

          var d = chan.attributes;
          d.names = update;
          chan.set(d);
          self.updateNames(chan);

          self.addMessage(chan.get("channel"), oldnick + " is now known as " + newnick);
        }


      });

    });

    self.socket.addListener("part", function(channel, nick, reason, message) {

      var data = {
        channel: channel,
        nick: nick,
        reason: reason,
        message: message
      };

      self.removeUser(channel, nick);

      if (!Komanda.settings.get("display.hidejoinpart")) {
        self.addMessage(channel, nick + " [" + message.prefix + "] has left the room. " + (reason ? "[" + reason + "]" : "") + "");
      }

      Komanda.vent.trigger("part", data);
    });

    self.socket.addListener("kick", function(channel, nick, by, reason, message) {

      var data = {
        channel: channel,
        nick: nick,
        by: by,
        reason: reason,
        message: message
      };

      self.removeUser(channel, nick);
      Komanda.vent.trigger("kick", data);
    });

    self.socket.addListener("quit", function(nick, reason, channels, message) {

      var data = {
        channels: channels,
        nick: nick,
        reason: reason,
        message: message
      };

      _.each(self.channels.models, function(channel) {
        if (channel.get("names").hasOwnProperty(nick)) {
          self.removeUser(channel.get("channel"), nick);
          self.addMessage(channel.get("channel"), nick + " [" + message.prefix + "] has left IRC. " + (reason ? "[" + reason + "]" : "") + "");
        }
      });

      Komanda.vent.trigger("quit", data);
    });

    self.socket.addListener("kill", function(nick, reason, channels, message) {

      var data = {
        channels: channels,
        nick: nick,
        reason: reason,
        message: message
      };

      self.removeUser(channels, nick);
      Komanda.vent.trigger("kill", data);
    });

  };

  Client.prototype.updateNames = function(channel, newNames) {
    var self = this;

    if (channel) {
      var names = newNames || channel.get("names");

      var html = NamesView({
        names: names
      });

      setTimeout(function() {
        $("#content .channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + channel.get("channel") + "\"] .names").replaceWith(html);
        var chans = _.map(self.channels.models, function(c) {
          return c.get("channel");
        });

        Komanda.vent.trigger(self.options.uuid + ":" + channel.get("channel") + ":update:words", names, chans);
      }, 1);
    }

    self.channelsView.render();
  };

  Client.prototype.channelsForUser = function(user) {
    var self = this;
    var channels = [];

    _.each(self.channels.models, function(m) {
      if (_.contains(m.get("names")), user) {
        channels.push(m);
        self.removeUser(m.get("channel"), user);
      }
    });
  };

  Client.prototype.removeUser = function(channel, nick) {
    var self = this;

    if (typeof channel === "string") {
      var chan = self.findChannel(channel);

      if (chan) {

        if (self.me(nick)) {
          self.removeAndCleanChannel(chan, self.options.uuid);
        } else {

          var names = _.omit(chan.get("names"), nick);

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
          var namesd = _.omit(chans.get("names"), nick);

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

  Client.prototype.addCode = function(channel, text) {
    var self = this;
    var server = self.options.uuid;

    var chan = $("div.channel[data-server-id=\"" + server + "\"][data-name=\"" + channel + "\"] div.messages");
    var html = "";

    if (chan.length > 0) {
      html = Message({
        code: true,
        text: text
      });

      chan.append(html);
    }

    Helpers.scrollUpdate(chan);
  };

  Client.prototype.addMessage = function(channel, text, isNotice) {
    var self = this;
    var server = self.options.uuid;

    var chan = $("div.channel[data-server-id=\"" + server + "\"][data-name=\"" + channel + "\"] div.messages");

    if (chan.length > 0) {

      var html = "";

      if (isNotice) {
        html = Notice({
          nick: self.nick,
          to: channel,
          text: text
        });
      } else {
        html = Message({
          text: text
        });
      }

      chan.append(html);

      Helpers.scrollUpdate(chan, isNotice);
    }
  };

  Client.prototype.statusMessage = function (text) {
    var self = this;

    self.addMessage("Status", text, true);
  };

  Client.prototype.sendMessage = function(nick, to, text, message, flip, isNotice, isAction) {
    var self = this;

    var data = {
      nick: nick,
      to: to,
      text: text,
      message: message,
      server: self.options.uuid,
      uuid: uuid.v4(),
      flip: flip,
      isAction: isAction
    };

    // Cannot be cached as a global variable as value isn't updated when user changes settings
    var highlightParse = Komanda.settings.get("notifications.regexHighlight");
    // We always want to highlight our own nick so include that even if the regex string is empty
    if (highlightParse === "") {
      highlightParse = self.nick;
    } else {
      highlightParse.concat("|" + self.nick);
    }
    var regex = new RegExp(highlightParse, "i");
    var exclParse = Komanda.settings.get("notifications.regexIgnoreNicks").replace(" ", "").split(",");
    var exclRegexString = "";
    for (var i = 0; i < exclParse.length; i++) {
      if (i > 0) {
        exclRegexString = exclRegexString + "|";
      }
      exclRegexString = exclRegexString + exclParse[i];
    }
    var testExcludes = exclRegexString !== ""; // Don't test exclusions if its empty, i.e. short circuit
    var exclRegex = new RegExp(exclRegexString, "i");

    if (regex.test(text) && !self.me(nick)) {
      if (testExcludes) {
        if (!exclRegex.test(nick)) {
          data.highlight = true;
        }
      } else {
        data.highlight = true;
      }
    }

    var channel;

    if (flip) {
      channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + nick + "\"] div.messages");
    } else {
      channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + to + "\"] div.messages");
    }

    var html;
    if (isNotice) {
      data.sender = self.me(nick);
      data.toChannel = Channel.isChannel(to);
      html = Notice(data);
    } else {
      html = Message(data);
      // We check that the message received is not a pm and is not a highlight.
      if (data.flip !== true && data.highlight !== true) {
        Komanda.vent.trigger("komanda:soundnotification", "chat");
        // If it was not a normal message, we check if it is a pm
      } else if (data.flip === true) {
        Komanda.vent.trigger("komanda:soundnotification", "pm");
      }
    }

    if (channel.length > 0) {
      _.defer(function() {
        channel.append(html);

        if (data.highlight) {
          if (Komanda.Notification && Komanda.settings.get("notifications.pm")) {
            var n = new Komanda.Notification("Highlight: " + to, {
              tag: "Komanda",
              body: "<" + nick + "> " + text
            });
          }
          // In order to call the highlight sound, we have to make sure it is not a pm. If you are
          // highlighted in a PM, it would count as a pm sound, not highlight sound.
          if (data.flip !== true) {
            Komanda.vent.trigger("komanda:soundnotification", "highlight");
          }
        }

      });


      if (Komanda.current.channel !== (flip ? nick : to)) {
        var server = self.options.uuid;

        if (!Komanda.store.hasOwnProperty(server)) {
          Komanda.store[server] = {
            count: {}
          };
        }

        if (data.highlight) {
          Komanda.store[server][(flip ? nick : to)] = 2;
        } else if (Komanda.store[server][(flip ? nick : to)] !== 2) {
          Komanda.store[server][(flip ? nick : to)] = 1;
        }

        if (Komanda.store[server][(flip ? nick : to)] === 1) {
          $("li.channel-item[data-server-id=\"" + server + "\"][data-name=\"" + (flip ? nick : to) + "\"]").addClass("new-messages");
        } else {
          $("li.channel-item[data-server-id=\"" + server + "\"][data-name=\"" + (flip ? nick : to) + "\"]").addClass("highlight");
        }
      }

      // badge logic
      if (Komanda.current.channel !== (flip ? nick : to)) {
        self.updateBadgeCount((flip ? nick : to));
      } else {
        if (Komanda.blur) self.updateBadgeCount((flip ? nick : to));
      }

      Komanda.settings.fetch();

      Komanda.vent.trigger("komanda:update:badge", {
        server: self.options.uuid
      });

      setTimeout(function() {
        Helpers.scrollUpdate(channel);
      }, 10);
    }
  };

  Client.prototype.removeAndCleanChannel = function(channel) {
    var self = this;
    channel.removeChannel(channel.get("channel"), channel.get("server"));
    self.channels.remove(channel);
  };

  Client.prototype.buildPM = function(nick) {
    var self = this;

    if (!nick) {
      nick = "Status";
    }

    var chan = self.findChannel(nick);

    if (!chan) {
      chan = new Channel({
        channel: nick,
        server: self.options.uuid,
        names: {},
        name: nick,
        pm: true,
        status: false
      });

      var view = new ChannelView({
        model: chan
      });

      self.views.push(view);

      self.channels.add(chan);
      $(".channel-holder").append(view.render().el);
    }

    return nick === "Status";
  };

  Client.prototype.updateBadgeCount = function(key) {
    var self = this;
    var server = self.options.uuid;

    if (!Komanda.store.hasOwnProperty(server)) {
      Komanda.store[server] = {};
    }

    if (!Komanda.store[server].hasOwnProperty("count")) {
      Komanda.store[server].count = {};
    }

    if (!Komanda.store[server].count.hasOwnProperty(key)) {
      Komanda.store[server].count[key] = 0;
    }

    Komanda.store[server].count[key]++;

    // $("li.channel-item[data-server-id=\"" + server + "\"][data-name=""+key+""] span.notification-count").html(Komanda.store[server].count[key]);
  };

  return Client;
});
