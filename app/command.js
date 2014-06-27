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
    return _.map(Command.list.concat(Command.aliases), function (command) {
      return "/" + command.title;
    });
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

  return Command;
});
