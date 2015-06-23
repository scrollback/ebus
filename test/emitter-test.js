/*global require, module, console*/
/*

This unit test describes the working of the Event Bus (Event Emitter).

4 subscribers and 1 emitter has been defined for a text action.
2 of these subscribers have a priority number while the other 2 have priority categories.
The subscirbers are of priorities 100,200,300 and 900.
These subscribers should be fired in the descending order of their priorities.
Each subscriber attaches a unique property to the payload object.
The correctness of the bus is checked by asserting the order in which the listeners were called (This is
verified by the prescence of the uniqe properties attached by the listeners).

*/

/* global describe */
/* global it */

var priorities = {
	antiflood: 1000,
	validation: 900,
	loader: 850,
	sudo: 825,
	appLevelValidation: 812,
	authentication: 800,
	authorization: 700,
	antiabuse: 600,
	modifier: 500,
	gateway: 400,
	cache: 300,
	storage: 200,
	watcher: 100
};

var core = new (require('../ebus.js'))(priorities);

core.setDebug(true);
core.setYields(true);

var assert = require('assert');

describe("Testing Event Bus", function(){
	it("Emitting events with no listener", function(done){
		core.emit("random", {id: "id"}, function(err, payload) {
			assert.ok(!err);
			assert.ok(payload);
			assert.ok(payload.id === "id");
			done();
		});
	});

	it("Attaching events to core", function(done){
		core.on('text', function(message, callback){
			var truthy = false;
			message.listener200 = new Date().getTime();
			if(message.hasOwnProperty('listener900') && message.hasOwnProperty('listener300')){
				truthy = true;
			}
			assert.ok(truthy);
			callback();
		}, 200);
		core.on('text', function(message, callback){ // 900
			assert.ok(message.id === '1');
			message.listener900 = new Date().getTime();
			callback();
		}, "validation");
		core.on('text', 100, function(message){ //100
			var truthy = false;
			message.listener100 = new Date().getTime();
			if(message.hasOwnProperty('listener900') && message.hasOwnProperty('listener300') && message.hasOwnProperty('listener200')){
				truthy = true;
			}
			assert.ok(truthy);
//			callback();
		});
		core.on('text', function(message, callback){
			var truthy = false;
			message.listener300 = new Date().getTime();
			if(message.hasOwnProperty('listener900')){
				truthy = true;
			}
			assert.ok(truthy);
			callback();
		}, 300);
		core.emit('text', {id:'1', from: 'amal', text: 'hey'}, function(err, data){
			var truthy = false;
			if(data.hasOwnProperty('listener900') && data.hasOwnProperty('listener300') && data.hasOwnProperty('listener200') && data.hasOwnProperty('listener100')){
				truthy = true;
			}
			if(!err){
				assert.ok(truthy);
				done();
			}
		});
	});

});

describe("testing invalid params:", function() {
	it("undefined priority", function(done) {
		try{
			core.on("text", function(a, n) {
				n();
			});
		} catch(e){
			assert.ok(true);
		}
		done();
	});

	it("false priority", function(done) {
		try{
			core.on("text", function(a, n) {
				n();
			});
		} catch(e){
			assert.ok(true);
		}
		done();
	});
	it("object priority", function(done) {
		try{
			core.on("text", function(a, n) {
				n();
			});
		} catch(e){
			assert.ok(true);
		}
		done();
	});
	it("number priority", function(done) {
		try{
			core.on("text", function(a, n) {
				n();
			}, 100);
			assert.ok(true);
		} catch(e){
			assert.ok(false);
		}
		done();
	});
	it("string priority", function(done) {
		try{
			core.on("text", function(a, n) {
				n();
			}, "validation");
			assert.ok(true);
		} catch(e){
			assert.ok(false);
		}
		done();
	});

  it("should turn off listeners", function (done) {
    var core2 = new (require('../ebus.js'))(priorities);

    function callback() {
      assert(false);
    }

    core.on('event1', callback, 500);
    core.off('event1', callback);

    core.emit('event1', {}, done);

  });
});


describe('sync, async mix', function () {
	it('should handle a mix of sync and async handlers properly', function () {
		var bus = new (require('../ebus.js'))(),
			e = 'test', handlerCount = 0, fireCount = 0, stackDepth;
		
		bus.setDebug(true);
		
		function depth() {
			return new Error().stack.split('\n').length - 3;
		}
		
		
		bus.on(e, function f1s(data) {
			// a Sync handler
			stackDepth = depth();
			fireCount++;
		}, 900);
		
		bus.on(e, function f2u(d, next) {
			// Async signature but actually sync
			assert.equal(depth(), stackDepth);
			fireCount++;
			next();
		}, 800);
		
		bus.on(e, function f3a(d, next) {
			// First async listener
			assert.equal(depth(), stackDepth);
			assert.equal(fireCount, 2);
			process.nextTick(function () {
				console.log("f3a cb");
				fireCount++;
				next(); 
			});
		}, 700);
		
		bus.on(e, function f4s() {
			// A sync at same prio - runs parallel
			assert.equal(depth(), stackDepth);
			assert.equal(fireCount, 2);
			fireCount++;
		}, 700);
		
		bus.on(e, function f5u(d, next) {
			// An async which behaves sync at same prio - runs parallel
			assert.equal(depth(), stackDepth);
			assert.equal(fireCount, 3);
			fireCount++;
			next()
		}, 700);
		
		bus.on(e, function f6a(d, next) {
			// Another async at same prio - runs parallel
			assert.equal(fireCount, 4);
			assert.equal(depth(), stackDepth)
			process.nextTick(function () {
				console.log("f6a cb");
				fireCount++;
				next(); 
			});			
		}, 700);
		
		bus.on(e, function f7a(d, next) {
			// Async at different prio - waits until the previous two asyncs finish
			assert.equal(fireCount, 6);
			assert.notEqual(depth(), stackDepth)
			process.nextTick(function () {
				console.log("f7a cb");
				fireCount++;
				next(); 
			});			
		}, 500);
		
		bus.emit(e, {}, function () {
			assert.equal(fireCount, 7);
		})
	});
	
	it('should handle async errors correctly', function () {
		var bus = new (require('../ebus.js'))(),
			e = "test";
		
		bus.setDebug(true);
		bus.setYields(true);
		
		bus.on(e, function (d, next) {
			process.nextTick(function () {
				next();
			});
		}, 900);
		
		bus.on(e, function (d, next) {
			process.nextTick(function () {
				next(Error('testing'));
			});
		}, 900);
		
		bus.on(e, function (d, next) {
			process.nextTick(function () {
				next();
			});
		}, 900);
		
		bus.on(e, function () {
			assert(false, 'Function was called after error');
		}, 800);
		
		bus.emit(e, {}, function (err, d) {
			assert.equal(err.message, 'testing');
		});
	});
	
	it('should handle sync errors correctly', function () {
		var bus = new (require('../ebus.js'))(),
			e = "test";
		
		bus.setDebug(true);
//		bus.setYields(true);
		
		bus.on(e, function (d, next) {
			process.nextTick(function () {
				next();
			});
		}, 900);
		
		bus.on(e, function () {
			throw (Error('testing'));
		}, 900);
		
		bus.on(e, function (d, next) {
			process.nextTick(function () {
				next(Error('testing2'));
			});
		}, 900);

				
		bus.on(e, function (d, next) {
			next(Error('testing2'));
		}, 900);
				
		bus.on(e, function (d, next) {
			next();
		}, 900);
		
		bus.on(e, function (d) {
			assert(false, 'Function was called after error');
		}, 800);
		
		bus.emit(e, {}, function (err, d) {
			assert.equal(err.message, 'testing');
		});
	});
});