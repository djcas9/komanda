define('templates/helpers/sortNames', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper('sortNames', function(context, options) {
    var buffer = "";
    var op = [];
    var voice = [];
    var normal = [];

    for (var user in context) {
      var value = context[user];

      if (value === "@") {
        op.push(user);
      } else if (value === "+") {
        voice.push(user);
      } else {
        normal.push(user);
      }
    }

    op.sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    voice.sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    normal.sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    for (var i = 0; i < op.length; i += 1) {
      var name = op[i];

      buffer += options.fn({
        name: name,
        value: "@"
      });
    }

    for (var x = 0; x < voice.length; x += 1) {
      var xname = voice[x];

      buffer += options.fn({
        name: xname,
        value: "+"
      });
    }

    for (var y = 0; y < normal.length; y += 1) {
      var yname = normal[y];

      buffer += options.fn({
        name: yname,
        value: ""
      });
    }

    return buffer;
  });

});



