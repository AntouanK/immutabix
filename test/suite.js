

var should = require('should');


describe('immutabix', function(){

  var immutabix = require('../index');


  describe('immutabix module', function(){

    it('should exist', function(){
      should.exist(immutabix);
    });

    it('should have a .getRaw function', function(){
      should(immutabix.getRaw).be.a.Function;
    });

    it('should have a .set function', function(){
      should(immutabix.set).be.a.Function;
    });

  });



  describe('immutabix.getRaw()', function(){

    it('should return the root immutable map', function(){

      var rawMap = immutabix.getRaw();

      should(rawMap).be.an.Object;
      should(rawMap.toString()).equal('Map {}');
    });
  });




  describe('immutabix.set(path, value)', function(){

    it('should set a value at the given path', function(){

      var rawMap = immutabix.getRaw(),
          path   = ['foo', 'bar',' baz'];

      immutabix.set(path, 'foo-value');

      var fooValue = immutabix.getRaw().getIn(path);

      should(fooValue).equal('foo-value');
    });
  });

});
