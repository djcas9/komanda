define([], function() {

  function History(n) {
    this.list = [];
    this.length = n || 100;
  }

  History.prototype.add = function(value) {
    var self = this;
    if (self.list.length >= self.length) self.list.pop();
    self.list.unshift(value);
  };

  History.prototype.get = function(i) {
    var self = this;
    if (self.list[i]) return self.list[i];
  };

  return History;
});

