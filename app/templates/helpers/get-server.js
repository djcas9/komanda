define('templates/helpers/get-server', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper('get-server', function(uuid, options) {
    var server = Komanda.sessions.get(uuid);
    if (server) return options.fn(server.attributes);
  });

});



