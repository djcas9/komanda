define('templates/helpers/version', [
  'hbs/handlebars',
  'underscore',
  'helpers'
], function(Handlebars, _, Helpers) {

  Handlebars.registerHelper("version", function(obj) {
    return Helpers.version;
  });

});

