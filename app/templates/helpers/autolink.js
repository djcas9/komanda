define('templates/helpers/autolink', [
  'hbs/handlebars',
  'underscore',
  'jquery',
  'autolink'
], function(Handlebars, _, $) {

  Handlebars.registerHelper("autolink", function(text) {
    var images = [];

    var message = Handlebars.Utils.escapeExpression(text).autoLink({
      target: "_blank", rel: "nofollow",
      callback: function(url) {
        if (/\.(gif|png|jpe?g)$/i.test(url)) {
          images.push('<a href="'+url+'" rel="nofollow" target="_BLANK"><img src="' + url + '"></a>');
          return '<a href="'+url+'" rel="nofollow" target="_BLANK">'+url+'</a>';
        } else {
          return null; 
        }
      }
    });

    if (images.length > 0) message += "<br />" + images.join(' ');
    return new Handlebars.SafeString(message);
  });

});

