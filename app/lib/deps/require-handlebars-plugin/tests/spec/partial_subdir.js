var templates = ['partial_subdir', 'subdir/parent', 'partial_fullpath'];

templates = templates.map(function(template) {
  return 'hbs!'+require.toUrl('tests/templates/'+template);
});

define(templates, function(template, parentTemplate, fullPathTemplate) {

  describe("template with a partial in a subdirectory {{> partials/_simple}}", function() {

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

  describe("template with a partial in a higher directory", function() {

   it("loads the partial using a relative path {{> ../partials/_simple}}", function() {

      var html = parentTemplate({partialValue: "ha"});
      var container = document.createElement('div');
      container.innerHTML = html;
      var bs = container.getElementsByTagName('b');
      expect(bs).to.exist;
      expect(bs.length).to.equal(1);
      expect(bs[0].innerText).to.equal('Hello ha');

    });

    it("loads the partial using an absolute path {{> tests/templates/partials/_simple}}", function() {

      var html = fullPathTemplate({partialValue: "ha"});
      var container = document.createElement('div');
      container.innerHTML = html;
      var bs = container.getElementsByTagName('b');
      expect(bs).to.exist;
      expect(bs.length).to.equal(1);
      expect(bs[0].innerText).to.equal('Hello ha');

    });
 
  });

});
