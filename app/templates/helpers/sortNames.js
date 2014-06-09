define('templates/helpers/sortNames', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper('sortNames', function(context, options) {
    var buffer = "";
    var op = [];
    var voice = [];
    var normal = [];

    for (user in context) {
      var value = context[user];

      if (value === "@") {
        op.push(user);
      } else if (value === "+") {
        voice.push(user);
      } else {
        normal.push(user);
      }
    }

    op.sort();
    voice.sort();
    normal.sort();

    for (var i = 0; i < op.length; i += 1) {
      var name = op[i];

      buffer += options.fn({
        name: name,
        value: "@"
      });
    }

    for (var i = 0; i < voice.length; i += 1) {
      var name = voice[i];

      buffer += options.fn({
        name: name,
        value: "+"
      });
    }

    for (var i = 0; i < normal.length; i += 1) {
      var name = normal[i];

      buffer += options.fn({
        name: name,
        value: ""
      });
    }

    return buffer;
  });

});



