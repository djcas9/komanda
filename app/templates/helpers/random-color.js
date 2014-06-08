define('templates/helpers/random-color', ['hbs/handlebars'], function ( Handlebars ) {

  var makeHashCode = function(str){
    var hash = 0;
    if (str.length == 0) return hash;
    for (i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash<<5)-hash) + c;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  Handlebars.registerHelper('random-color', function(user, dark) {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    var hash1, hash2, hash3;

    if (user) {
      var hash = makeHashCode(user); 

      if (dark) {
        hash1 = Math.abs(hash * 7) % (200) + 55; 
        hash2 = Math.abs(hash * 13) % (200) + 55; 
        hash3 = Math.abs(hash * 19) % (200) + 55;  
      } else {
        hash1 = Math.abs(hash * 7) % (200); 
        hash2 = Math.abs(hash * 13) % (200); 
        hash3 = Math.abs(hash * 19) % (200);  
      }

      return "rgb(" + hash1 + "," + hash2 + "," + hash3 + ")";
    } else {
      for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
      } 
    }

    return color;
  });

});
