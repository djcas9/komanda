define("command", [
  "app",
  "jquery",
  "underscore"
], function(Komanda, $, _) {

  var Command = {};

  Command.list = [];
  Command.aliases = [];

  var registerId = 0;

  /**
   * Registers a command with a handler callback. You can match 3 different ways:
   * String: case-insensitively matches the command using a string
   * RegExp: the input string is always LOWERCASE and does NOT include the leading slash
   * Function: gets passed in the data, NOT the command string for more complicated matching
   *
   * If you pass a function as the handler, it is treated as a command.
   * If you pass a string, it is treated as an alias.
   *
   * Title: this is what shows up in autocomplete. Only needed for RegExp and Functions.
   * Set to null for default for strings.
   *
   * Priority: each match type has a default priority based on their complexity (functions -> regexp -> string)
   * Commands with higher priority get checked first.
   * You MAY override this with the priority argument if you want to override Komanda's default functionality
   * or ensure another plugin doesn't override yours.
   *
   */
  Command.register = function (match, handler, priority, title) {
    var type = 0;

    if (_.isString(match)) {
      type = 1;
      match = match.toLowerCase();

      if (match[0] === "/") match = match.slice(1);
    }
    if (_.isRegExp(match)) type = 2;
    if (_.isFunction(match)) type = 3;

    // alias
    if (_.isString(handler)) {
      Command.aliases.push({
        type: type,
        priority: priority > -1 && _.isFinite(priority) ? priority : type,
        match: match,
        aliased: handler,
        title: title || (type === 1 ? match : null),
        id: registerId++
      });

      Command.aliases.sort(function (a, b) {
        if (a.priority === b.priority) {
          return a.id < b.id;
        }

        return a.priority < b.priority;
      });
    }
    // command
    else if (_.isFunction(handler)) {
      Command.list.push({
        type: type,
        priority: priority > -1 && _.isFinite(priority) ? priority : type,
        match: match,
        handler: handler,
        title: title || (type === 1 ? match : null),
        id: registerId++
      });

      Command.list.sort(function (a, b) {
        if (a.priority === b.priority) {
          return a.id < b.id;
        }

        return a.priority < b.priority;
      });
    }
  };

  Command.getCommands = function () {
    return _.pluck(Command.list.concat(Command.aliases), "title");
  };

  Command.handle = function (client, data, defaultFn) {
    var cmds = Command.list;
    var aliases = Command.aliases;
    var args = data.message.slice(1).split(" ");
    var cmd = args[0].toLowerCase();
    var i = 0;

    for (i = 0; i < aliases.length; i++) {
      // string
      if (aliases[i].type === 1 && cmd === aliases[i].match) {
        cmd = aliases[i].aliased;
        break;
      }
      // regex
      else if (aliases[i].type === 2 && aliases[i].match.test(cmd)) {
        cmd = aliases[i].aliased;
        break;
      }
      // function
      else if (aliases[i].type === 3 && aliases[i].match(data)) {
        cmd = aliases[i].aliased;
        break;
      }
    }

    // ensure aliases work for undefined commands
    data.message = "/" + cmd + " " + args.slice(1).join(" ");

    for (i = 0; i < cmds.length; i++) {
      // string
      if (cmds[i].type === 1 && cmd === cmds[i].match) {
        return cmds[i].handler(client, data, args.slice(1));
      }
      // regex
      else if (cmds[i].type === 2 && cmds[i].match.test(cmd)) {
        return cmds[i].handler(client, data, args.slice(1));
      }
      // function
      else if (cmds[i].type === 3 && cmds[i].match(data)) {
        return cmds[i].handler(client, data, args.slice(1));
      }
    }

    return defaultFn(client, data, args);
  };

  // internal commands go here
  // possibly move these to a different file. client.js or main.js?
  // make sure to set priority on internal functions so plugins have to explicity set priority to override
  // String: 4
  // RegExp: 5
  // Function: 6
  Command.register("msg", function (client, data, args) {
    Komanda.vent.trigger(client.options.uuid + ":send", { target: args[0], message: args.slice(1).join(" ") });
    Komanda.vent.trigger(client.options.uuid + ":pm", args[0]);
  }, 4);

  Command.register("query", function (client, data, args) {
    Komanda.vent.trigger(client.options.uuid + ":pm", args[0]);
  }, 4);

  Command.register("me", function (client, data, args) {
    client.socket.action(data.target, args.join(" "));
    //client.addMessage(data.target, args.join(" "), true);
  }, 4);

  Command.register("whois", function (client, data, args) {
    if (args.length > 0) {
      client._whois[args[0].toLowerCase()] = {};
      client.socket.send("WHOIS", args[0]);
    }
  }, 4);

  Command.register("part", function (client, data, args) {
    var channels = (args[0]) ? args[0].split(",") : [data.target];
    var msg = args.slice(1).join(" ") || "Bye!";

    _.each(channels, function (channel) {
      // TODO: central channel name validation
      if (!channel.match(/^[#&]/)) return;

      client.socket.part(channel, msg, function() {
        var chan = client.findChannel(channel);

        if (chan) client.removeAndCleanChannel(chan, client.options.uuid);

        Komanda.vent.trigger("channel/part", client.options.uuid, channel);
      });
    });
  }, 4);

  Command.register("clear", function (client, data, args) {
    $("div.channel[data-server-id=\"" + client.options.uuid + "\"][data-name=\"" + data.target + "\"] div.messages").html("");
  }, 4);

  Command.register("notice", function (client, data, args) {
    client.socket.notice(args[0], args.slice(1).join(" "));
    //render(true); // is this needed?
  }, 4);

  Command.register("set", function (client, data, args) {
    var setting;

    if (args.length === 0) {
      client.addMessage("Status", JSON.stringify(Komanda.settings.toJSON()));
    }
    else if (args.length === 1) {
      setting = Komanda.settings.get(args[0]);
      client.addMessage("Status", args[0] + " = " + _.isObject(setting) || _.isArray(setting) ? JSON.stringify(setting) : setting);
    }
    else if (args.length === 2) {
      var val;

      try {
        val = JSON.parse(args[1]);
      }
      catch (e) {
        val = args[1];
      }

      Komanda.settings.set(args[0], val);
      setting = Komanda.settings.get(args[0]);
      client.addMessage("Status", args[0] + " = " + _.isObject(setting) || _.isArray(setting) ? JSON.stringify(setting) : setting);
    }
  }, 4);

  // aliases
  Command.register("q", "query", 4);
  Command.register("pm", "query", 4);
  Command.register("j", "join", 4);

  return Command;
});
