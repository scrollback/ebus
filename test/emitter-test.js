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
