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
    self.nick = session.attributes.nick;
    self.socket = null;
    self.session = session;

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
    if (self.socket) {
      if (self.socket.conn.readable && self.socket.conn.writable) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };

  Client.prototype.connect = function(callback) {
    var self = this;

    var options = _.extend({}, this.options);
    options.channels = [];
    self.socket = new this.irc.Client(this.options.server, this.options.nick, options);

    self.bind();

    self.socket.connect(options.retryCount || 50, function() {
      if (callback && typeof callback === "function") callback(self);

      self.session.set("connectionOpen", true);
      if (Komanda.connections.hasOwnProperty(self.options.uuid)) {
        Komanda.connections[self.options.uuid].hasClient = true;
      }

      Komanda.vent.trigger("connect", {
        server: self.options.uuid,
        name: self.options.name
      });
    });
  };

  Client.prototype.disconnect = function(callback) {
    var self = this;

    self.socket.disconnect("Bye", function() {
      self.session.set("connectionOpen", false);

      _.each(self.views, function(v) {
        v.close();
      });

      self.socket.conn.end();
      clearInterval(self.reconnectCheck);

      if (callback && typeof callback === "function") callback();

      Komanda.vent.trigger("disconnect", {
        server: self.options.uuid,
        name: self.options.name
      });
    });
  };

  Client.prototype.processWhois = function(message) {
    var self = this;

    var target = message.args[1].toLowerCase();
    // return if called out of turn
    if (!self._whois[target]) {
      return;
    }
    var data = message.args.slice(2);

    switch(message.command) {
      // away
      case "rpl_away":
        if(data.length > 1) {
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

  Client.prototype.bind = function() {
    var self = this;

    if (self.binded) return;
    self.binded = true;

    self.reconnectFunction = function() {
      if (!window.navigator.onLine) {
        if (self.socket) {
          self.socket.conn.requestedDisconnect = false;
          $(".channel[data-server-id=\"" + self.options.uuid + "\"] .messages").html();
          self.socket.conn.end();
          self.socket.connect();
        }
        clearInterval(self.reconnectCheck);
      }
    };

    self.reconnectCheck = setInterval(self.reconnectFunction, 2000);

    self.offlineCheckFunction = function() {
      if (self.socket) {
        if (self.socket.conn.readable && self.socket.conn.writable) {
          self.session.set("connectionOpen", true);
        } else {
          self.session.set("connectionOpen", false);
        }
      } else {
        self.session.set("connectionOpen", false);
      }
    };

    self.offlineCheck = setInterval(self.offlineCheckFunction, 4000);

    Komanda.vent.on(self.options.uuid + ":disconnect", function(callback) {
      self.disconnect(callback);
    });

    Komanda.vent.on("disconnect", function() {
      self.session.set("connectionOpen", false);
      self.reconnectCheck = setInterval(self.reconnectFunction, 2000);
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

      self.reconnectCheck = setInterval(self.reconnectFunction, 2000);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").removeClass("offline");
    });

    self.socket.addListener("connection:end", function() {
    });

    self.socket.addListener("connection:abort", function(max, count) {
    });

    self.socket.addListener("connection:timeout", function() {
    });

    self.socket.addListener("connection:error", function(error) {
      var message = "Komanda Error: " + (error.hasOwnProperty("message") ? error.message : "Unknown Error");

      if (error.code === "ENOTFOUND") {
        message = "Komanda Error: You are not connected to the internet.";
      }

      self.addMessage("Status", message, true);
    });

    self.socket.addListener("connection:close", function() {
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").addClass("offline");
    });

    self.socket.addListener("connection:reconnect", function(retry) {
    });

    self.socket.addListener("connection:disconnect", function(retry) {
      clearInterval(self.reconnectCheck);
      self.reconnectCheck = null;

      self.session.set("connectionOpen", false);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").addClass("offline");
    });

    self.socket.addListener("connection:connect", function() {
      self.session.set("connectionOpen", true);
      clearInterval(self.reconnectCheck);

      self.reconnectCheck = setInterval(self.reconnectFunction, 2000);
      $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"Status\"]").removeClass("offline");
    });

    self.socket.addListener("names", function(channel, names) {
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

      self.addMessage(channel, nick + " has joined the room. ["+message.prefix+"]");

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

        if(isNotice) {
          var cmd = dd.text.split(" ");
          dd.text = cmd.slice(2).join(" ");
          dd.to = cmd[1];
          dd.sender = true;
          dd.toChannel = !!data.target.match(/^[#&]/);
        }

        var channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + dd.to + "\"] div.messages");

        if (channel.length > 0) {
          var html = (isNotice) ? Notice(dd) : Message(dd);
          _.defer(function() {
            channel.append(html);
          });
        }

        if(!isNotice) {
          self.socket.say(dd.to, dd.text);
        }

        setTimeout(function() {
          Helpers.scrollUpdate(channel, true);
        }, 10);
      };

      if (data.message && data.message.match(/^\//)) {
        var command = data.message.split(" ");
        var $channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + data.target + "\"] div.messages");

        switch(command[0]) {
          case "/msg":
            Komanda.vent.trigger(self.options.uuid + ":send", { target: command[1], message: command.slice(2).join(" ") });
            Komanda.vent.trigger(self.options.uuid + ":pm", command[1]);
            break;
          case "/pm":
          case "/query":
            Komanda.vent.trigger(self.options.uuid + ":pm", command[1]);
            break;
          case "/op":
            break;
          case "/voice":
            break;
          case "/kick":
            break;
          case "/ban":
            break;
          case "/code":
            // command.shift();
            // var codeString = command.join(" ").replace( /\n/g, "\\n").replace( /\r/g, "\\r").replace( /\t/g, "\\t");
            // console.log(codeString);
            // var code = Helpers.displayCode(codeString, self.options.uuid, data.target);
            // self.addCode(data.target, code);
            break;
          case "/me":
            command.shift();
            self.socket.action(data.target, command.join(" "));
            self.addMessage(data.target, command.join(" "), true);
            break;
          case "/whois":
            if (command.length > 1) {
              self._whois[command[1].toLowerCase()] = {};
              self.socket.send("WHOIS", command[1]);
            }
          break;
          case "/part":
            var s = data.message.split(" ");
            var channels = (s[1]) ? s[1].split(",") : [data.target];
            var msg = s.slice(2).join(" ") || "Bye!";
            _.each(channels, function(channel) {
              if(!channel.match(/^[#&]/)) {
                return;
              }
              self.socket.part(channel, msg, function() {
                var chan = self.findChannel(channel);
                if (chan) {
                  self.removeAndCleanChannel(chan, self.options.uuid);
                }
                Komanda.vent.trigger("channel/part", self.options.uuid, channel);
              });
            });

            break;

          case "/clear":
            $channel.html("");
            break;

          case "/notice":
            self.socket.notice(command[1], command.slice(2).join(" "));
            render(true);
            break;

          default:
            command[0] = command[0].replace("\/", "");
            self.socket.send.apply(self.socket, command);
        }

      } else {
        render();
      }
    });

    Komanda.vent.on(self.options.uuid + ":pm", function(nick) {
      self.buildPM(nick, function() {
        $("li.channel-item[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + nick + "\"]").click();
      });
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
        if ((data.idleDuration.asHours() | 0) > 0) {
          idleParts.push((data.idleDuration.asHours() | 0) + "h");
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

    self.socket.addListener("pm", function(nick, text, message) {
    });

    self.socket.addListener("channellist", function(channel_list) {
      // only do the first hundred until we have a window to handle them all,
      // so we don"t deal with freezing
      _.each(channel_list.slice(0,100), function(channel) {
        var msg = channel.name + " (" + channel.users + ")";
        if(channel.topic) {
          msg += " || " + channel.topic;
        }
        self.addMessage("Status", msg);
      });
    });

    self.socket.addListener("notice", function(nick, to, text, message) {
      if ( to.match(/^[#&]/) ) {
        self.sendMessage(nick, to, text, message, undefined, true);
      } else {
        // PM

        if(!nick) {
          // this is a server status message
          self.addMessage("Status", message.args.join(" "));
        } else {
          self.buildPM(nick, function(status) {
            if (status) {
              self.addMessage("Status", text);
            } else {
              self.sendMessage(nick, to, text, message, true, true);

              if (window.Notification && Komanda.settings.get("notifications.highlight")) {
                var n = new Notification("Notice From " + nick, {
                  tag: "Komanda",
                  body: "->" + nick + "<- " + text
                });

                n.onClick = function() {
                  alert("word");
                };
              }
            }
          });
        }
      }
    });

    self.socket.addListener("message", function(nick, to, text, message) {

      if ( to.match(/^[#&]/) ) {
        self.sendMessage(nick, to, text, message);
      } else {
        // PM

        self.buildPM(nick, function(status) {
          if (status) {
            self.addMessage("Status", text);
          } else {
            self.sendMessage(nick, to, text, message, true);

            if (window.Notification && Komanda.settings.get("notifications.highlight")) {
              var n = new Notification("Private Message From " + nick, {
                tag: "Komanda",
                body: "<" + nick + "> " + text
              });

              n.onClick = function() {
                alert("word");
              };
            }
          }
        });
      }

    });

    self.socket.addListener("action", function(nick, to, text, message) {

      if ( to.match(/^[#&]/) ) {
        self.sendMessage(nick, to, text, message, false, false, true);
      } else {
        // PM

         self.buildPM(nick, function() {
            self.sendMessage(nick, to, text, message, true, false, true);

            if (window.Notification && Komanda.settings.get("notifications.highlight")) {
              var n = new Notification("Private Message From " + nick, {
                tag: "Komanda",
                body: nick + text
              });

              n.onClick = function() {
                alert("word");
              };
            }
        });
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
        self.removeAndCleanChannel(self.findChannel(message.args[1]), self.options.uuid);
        var box = Helpers.limp.box(Popup, {
          title: "Error #" + message.rawCommand,
          content: message.args[2] + ": " + message.args[1],
          buttons: [
            { classes: "right", close: true, name: "OK" }
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
        if (self.me(message.args[0])) message.args.shift();
        self.addMessage("Status", message.args.join(" "));
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

      self.addMessage(channel, nick + " has left the room. " + (reason ? "["+reason+"]" : "") + "");

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
          self.addMessage(channel.get("channel"), nick + " has left IRC. " + (reason ? "["+reason+"]" : "") + "");
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

    if (text.match(self.nick) && !self.me(nick)) {
      data.highlight = true;
    }

    var channel;

    if (flip) {
      channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + nick + "\"] div.messages");
    } else {
      channel = $("div.channel[data-server-id=\"" + self.options.uuid + "\"][data-name=\"" + to + "\"] div.messages");
    }

    var html;
    if(isNotice) {
      data.sender = self.me(nick);
      data.toChannel = !!to.match(/^[#&]/);
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
          if (window.Notification && Komanda.settings.get("notifications.pm")) {
            var n = new Notification("Highlight: " + to, {
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

        if (Komanda.store.hasOwnProperty(server)) {

          if (data.highlight) {
            Komanda.store[server][(flip ? nick : to)] = 2;
          } else {
            if (Komanda.store[server][(flip ? nick : to)] != 2) Komanda.store[server][(flip ? nick : to)] = 1;
          }

        } else {
          Komanda.store[server] = {
            count: {}
          };

          if (data.highlight) {
            Komanda.store[server][(flip ? nick : to)] = 2;
          } else {
            if (Komanda.store[server][(flip ? nick : to)] != 2) Komanda.store[server][(flip ? nick : to)] = 1;
          }
        }

        if (Komanda.store[server][(flip ? nick : to)] == 1) {
          $("li.channel-item[data-server-id=\"" + server + "\"][data-name=\"" + (flip ? nick : to) + "\"] div.status").addClass("new-messages");
        } else {
          $("li.channel-item[data-server-id=\"" + server + "\"][data-name=\"" + (flip ? nick : to) + "\"] div.status").addClass("highlight");
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

  Client.prototype.buildPM = function(nick, callback) {
    var self = this;

    if (!nick) nick = "Status";

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

    if (callback && typeof callback === "function") {
      if (nick === "Status") return callback(true);
      return callback(false);
    }
  };

  Client.prototype.updateBadgeCount = function(key) {
    var self = this;
    var server = self.options.uuid;

    if (Komanda.store.hasOwnProperty(server)) {

      if (Komanda.store[server].hasOwnProperty("count")) {
        if (Komanda.store[server].count.hasOwnProperty(key)) {
          Komanda.store[server].count[key]++;
        } else {
          Komanda.store[server].count[key] = 1;
        }
      } else {
        Komanda.store[server].count = {};
        Komanda.store[server].count[key] = 1;
      }

    } else {
      Komanda.store[server] = {
        count: {}
      };

      Komanda.store[server].count[key] = 1;
    }

    // $("li.channel-item[data-server-id=\"" + server + "\"][data-name=""+key+""] span.notification-count").html(Komanda.store[server].count[key]);
    return;
  };

  return Client;
});
