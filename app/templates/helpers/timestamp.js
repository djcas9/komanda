define("templates/helpers/timestamp", [
  "app",
  "hbs/handlebars",
  "moment"
], function(Komanda, Handlebars, moment) {
    
    function timestampFormat (timestamp) {
        return moment(timestamp || Date.now()).format(Komanda.settings.get("display.timestamp"));
    }
  
    // Register the helper.
    Handlebars.registerHelper("timestamp", timestampFormat);

    // Also return the helper so it can be used in scripts and not just in templates.
    return timestampFormat;
});
