define("templates/helpers/nickname", [
  "hbs/handlebars",
  "underscore"
], function(Handlebars, _) {

  Handlebars.registerHelper("nickname", function(server) {
    var s = Komanda.sessions.get(server);
    if (s) {
      return s.get("nick");
    } else {
      return "N/A";
    }
  });

});

