define([
  'app',
  'client'
], function(Komanda, Client) {

  var Connect = function(session, options) {
    this.session = session;
    this.options = options;
  };

  Connect.prototype.start = function(callback) {
    var self = this; 

    self.client = new Client(self.session); 

    self.client.connect(function() {
      self.client.bind();
      self.bind();
      if (callback && typeof callback === "function") callback();
    });
  };

  Connect.prototype.bind = function() {
    var self = this;
  };

  return Connect;
});
