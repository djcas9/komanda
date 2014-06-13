define('templates/helpers/nickname', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper("nickname", function(server) {
    var server = Komanda.settings.get(server);
    if (server) {
      return server.get('nick');
    } else {
      return "N/A"
    }
  });

});

