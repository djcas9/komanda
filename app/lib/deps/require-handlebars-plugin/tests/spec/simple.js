define(['hbs!'+require.toUrl('tests/templates/simple')], function(template) {

  describe("Simple handlebar template", function() {

    it("can load a simple template", function() {
      expect(typeof template).to.equal('function');
      var html = template({hello: 'world'});
      var container = document.createElement('div');
      container.innerHTML=html;
      var text = container.innerText.trim();
      expect(text).to.equal('This is a very simple template world');
    });

  });

});
