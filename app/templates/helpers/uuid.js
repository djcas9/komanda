define('templates/helpers/count', [
  'hbs/handlebars',
  'underscore',
  "uuid"
], function(Handlebars, _, uuid) {

  Handlebars.registerHelper("uuid", function(obj) {
    return uuid.v4();
  });

});

