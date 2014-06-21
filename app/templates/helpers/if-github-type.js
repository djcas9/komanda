define('templates/helpers/if-github-type', [
  'hbs/handlebars',
  'underscore'
], function(Handlebars, _) {

  Handlebars.registerHelper('if-github-type', function(type, options) {
    if (this.type === type) {
      return options.fn(this); 
    } else {
      return options.inverse(this); 
    }
  });

});



