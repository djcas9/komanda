define('templates/helpers/autolink', [
  'hbs/handlebars',
  'underscore',
  'jquery',
  "gistembed",
  "hbs!templates/partials/show-more",
  'autolink'
], function(Handlebars, _, $, GIST, ShowMore) {

  Handlebars.registerHelper("autolink", function(text, server, uuid) {
    var images = [];
    var code = [];
    var jsfiddle = [];

    var message = Handlebars.Utils.escapeExpression(text).autoLink({
      target: "_blank", rel: "nofollow",
      callback: function(url) {

        if (/\.(gif|png|jpe?g)$/i.test(url)) {

          images.push('<a href="'+url+'" rel="nofollow" target="_BLANK"><img src="' + url + '"></a>');

        } else if (/gist\.github\.com/i.test(url)) { 

          var gist = url.match(/gist.github.com\/(\w+)\/(.+)$/i);

          if (gist.length === 3) {
            var gistUser = gist[1];
            var gistID = gist[2];
            code.push(gistID);
          }

        } else if (/jsfiddle\.net\/(.+)\/(.+)$/i.test(url)) { 
          var embedURL = url;

          if (/\/$/.test(url)) {
            embedURL = embedURL + "embedded";
          } else {
            embeded = embeded + "/embedded";
          }
          jsfiddle.push('<iframe nwdisable nwfaketop style="width: 600px; height: 400px" src="'+embedURL+'"></iframe>');
        } else {
          // ...
        }

        return '<a href="'+url+'" rel="nofollow" target="_BLANK">'+url+'</a>';
      }
    });

    setTimeout(function() {
      if (images.length > 0 || code.length > 0 || jsfiddle.length > 0) {
        var id = "span#" + server + "-" + uuid;
        var div = $('div.embed-items', id);
        div.css('display', 'block');

        if (images.length > 0) div.append(images.join(' '));

        if (jsfiddle.length > 0) {
          div.append(ShowMore({
            icon: "code",
            title: "Toggle Attached Items",
            ele: "#" + server + "-" + uuid + " .embed-items",
            show: ".jsfiddle-holder"
          }));

          div.append("<div class='jsfiddle-holder'>" + jsfiddle.join(' ') + "</div>"); 
        } 

        if (code.length > 0) {

          div.append(ShowMore({
            icon: "code",
            title: "Toggle Attached Code Sample",
            ele: "#" + server + "-" + uuid + " .embed-items",
            show: ".gist"
          }));

          _.each(code, function(cid) {
            GIST.load(div, cid);
          });
        } 
      }
    }, 100);

    return new Handlebars.SafeString(message);
  });

});

