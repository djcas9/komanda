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

          if (Komanda.settings.get('embed.images')) {
            images.push('<a href="'+url+'" rel="nofollow" target="_BLANK"><img src="' + url + '"></a>');
          }

        } else if (/http(s)?:\/\/(.*\.)?twitter.com\/(\w+)\/status\/(\d+)$/.test(url)) {
          var match = url.match(/http(s)?:\/\/(.*\.)?twitter.com\/(\w+)\/status\/(\d+)$/i);
          var name = match[2];
          var id = match[3];
          if (!id) return;

          if (Komanda.settings.get('twitter')) {
            $.ajax({
              url: "https://api.twitter.com/1/statuses/oembed.json?id=" + id,
              type: "get",
              dataType: "json",
              success: function(data) {
                console.log(data);
              },
              error: function(a,b,c) {
                console.error(a,b,c);
              }
            });
          }
          
        } else if (/codepen.io\/\w+\/pen\/\w+/i.test(url)) {

          var codepen = url.match(/codepen.io\/(\w+)\/pen\/(\w+)/i);

          var user = codepen[0];
          var slug = codepen[1];

          // <p data-height="224" data-theme-id="0" data-slug-hash="KgvyC" data-default-tab="result" class='codepen'>See the Pen <a href='http://codepen.io/julianshapiro/pen/KgvyC/'>Velocity.js - Option: Loop</a> by Julian Shapiro (<a href='http://codepen.io/julianshapiro'>@julianshapiro</a>) on <a href='http://codepen.io'>CodePen</a>.</p>
          // <script async src="//codepen.io/assets/embed/ei.js"></script>
        } else if (/gist\.github\.com/i.test(url)) { 

          var gist = url.match(/gist.github.com\/(\w+)\/(.+)$/i);

          if (gist !== null && gist.length === 3) {
            var gistUser = gist[1];
            var gistID = gist[2];
            if (Komanda.settings.get('embed.gist')) {
              code.push(gistID);
            }
          }

        } else if (/jsfiddle\.net\/(.+)\/(.+)$/i.test(url)) { 
          var embedURL = url;

          if (/\/$/.test(url)) {
            embedURL = embedURL + "embedded";
          } else {
            embedURL = embedURL + "/embedded";
          }

          if (Komanda.settings.get('embed.jsfiddle')) {
            jsfiddle.push('<iframe nwdisable nwfaketop style="width: 600px; height: 400px" src="'+embedURL+'"></iframe>');
          }
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

