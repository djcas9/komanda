define('templates/helpers/autolink', [
  'hbs/handlebars',
  'underscore',
  'jquery',
  'autolink'
], function(Handlebars, _, $) {

  Handlebars.registerHelper("autolink", function(text) {
    var message = Handlebars.Utils.escapeExpression(text).autoLink({
      target: "_blank", rel: "nofollow",
      callback: function(url) {
      return /\.(gif|png|jpe?g)$/i.test(url) ? '<a href="'+url+'" target="_BLANK">'+url+'</a><br /><a href="'+url+'" target="_BLANK"><img src="' + url + '"></a><br />' : null;       
      }
    });

    return new Handlebars.SafeString(message);
  });

});

