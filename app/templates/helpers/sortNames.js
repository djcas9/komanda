define("templates/helpers/sortNames", [
  "hbs/handlebars",
  "underscore"
], function(Handlebars, _) {

  Handlebars.registerHelper("sortNames", function(context, options) {
    var buffer = "";
    var symbols = ["~", "!", "&", "@", "%", "+", ""];
    var users = {};
    _.each(symbols, function(symb) {
      users[symb] = [];
    });

    var sortFn = function (a, b) {
      return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
    };

    for (var user in context) {
      var value = context[user];
      // if we don't recognize the symbol, treat them as a regular user for
      // safety reasons
      if (!users[value]) {
        value = "";
      }
      users[value].push([user, value]);
    }

    for (var key in users) {
      if (users.hasOwnProperty(key)) {
        users[key].sort(sortFn);
      }
    }

    _.each(symbols, function(symb) {
      _.each(users[symb], function(user) {
        buffer += options.fn({
          name: user[0],
          value: user[1]
        });
      });
    });

    return buffer;
  });

});



