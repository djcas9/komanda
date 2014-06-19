define('templates/helpers/sortNames', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper('sortNames', function(context, options) {
    var buffer = "";
    var symbols = ["&", "~", "@", "%", "+", ""];
    var users = {
      "&": [],
      "~": [],
      "@": [],
      "%": [],
      "+": [],
      "": []
    };

    var sortFn = function (a, b) {
      return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
    };

    for (var user in context) {
      var value = context[user];
      users[value].push([user, value]);
    }

    for (var key in users) {
      if (users.hasOwnProperty(key)) {
        users[key].sort(sortFn);
      }
    }

    var symb;
    for (var s = 0; s < symbols.length; s += 1) {
      symb = symbols[s];
      for (var i = 0; i < users[symb].length; i += 1) {
        buffer += options.fn({
          name: users[symb][i][0],
          value: users[symb][i][1]
        });
      }
    }

    return buffer;
  });

});



