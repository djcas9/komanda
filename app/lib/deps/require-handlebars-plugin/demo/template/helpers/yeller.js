define(['Handlebars'], function ( Handlebars ){
  function yeller ( context, options ) {
    // Assume it's a string for simplicity.
    return context + "!!!!!!oneone!!one1";
  }

  Handlebars.registerHelper( 'yeller', yeller );
  return yeller;
});
