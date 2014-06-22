define([
  "app",
  "client",
  "underscore"
], function(Komanda, Client, _) {

  var Connect = function(session, options) {
    this.session = session;
    this.options = options;
    this.hasClient = false;

    this.client = new Client(session); 
  };

  Connect.prototype.start = function(callback) {
    var self = this; 


    this.hasClient = true;
    self.client.connect(function() {
      if (callback && typeof callback === "function") return callback(self.session.uuid);
    });
  };

  Connect.prototype.bind = function() {
    var self = this;
  };

  return Connect;
});
