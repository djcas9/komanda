// Require our template with the handlebars plugin
define(['hbs!template/one'], function (tmplOne) {
  // Find our container
  var container = document.getElementById('demo-app-container');
  // Run your template function, and inject it.
  container.innerHTML = tmplOne({
    adjective : 'favorite',
    listofstuff : ['bananas', 'democracy', 'expired milk']
  });
});
