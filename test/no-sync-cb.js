var assert = require("assert"),
	core = new (require("../ebus"))();


it('should give async callback when no listeners are there', function (done) {
	var t = 1;
	core.emit('event', {}, function () {
		assert.equal(t, 2);
		done();
	});
	t = 2;
});

it('should give async callback when all listeners are sync', function (done) {
	var t = 1;
	core.on('event', function(data){},200);
	core.on('event', function(data){}, 500);
	core.emit('event', {}, function(){
		assert.equal(t,2);
		done();
	});
	t=2;
});
it('should give async callback when a listener is async', function (done) {
	var t=1;
	core.on('event', function(data, next){
		next();
	}, 200);
	core.emit('event', {}, function(){
		assert.equal(t,2);
		done();
	});
	t=2;
});

it('should give async errback when an async listener calls back with error', function (done) {
	var t=1;
	core.on('event', function(data, next){
		next(Error());
	},100);
	core.emit('event', {},function(err, data){
		assert(err, "should have thrown error");
		assert.equal(t,2);
		done();
	});
	t=2;
});

