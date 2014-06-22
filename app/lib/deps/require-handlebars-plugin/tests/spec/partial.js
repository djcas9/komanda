define(['hbs!'+require.toUrl('tests/templates/partial')], function(template) {

  describe("template with a partial", function() {

    it("loads the partials", function() {

      var html = template({partialValue: "ha"});
      var container = document.createElement('div');
      container.innerHTML = html;
      var bs = container.getElementsByTagName('b');
      expect(bs).to.exist;
      expect(bs.length).to.equal(1);
      expect(bs[0].innerText).to.equal('Hello ha');

    });

  });

});
