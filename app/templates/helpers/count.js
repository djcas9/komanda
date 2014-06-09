define('templates/helpers/count', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper("count", function(obj) {
    return _.keys(obj).length;
  });

});

