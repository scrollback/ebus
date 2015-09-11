/* eslint-env mocha */

"use strict";
var assert = require("assert");
var core = new (require("../ebus"))({
	high: 900,
	low: 100
});

core.setDebug(1);

it ('should abort when error is thrown', function (done) {
	var t=0;
	core.on('e', function (o, next) {
		t++;
		assert.fail("it should not come here because high priority has thrown error");
		next();
	}, 'low');
	

	core.on('e', function (o, next) {
		t++;
		next();
	}, 'high');	
	
	
	core.on('e', function (o, next) {
		t++;
		next(Error('ERR_TO_BE_CAUGHT'));
	}, 'high');

	
	core.emit('e', {}, function (err, obj) {
		assert(err, "Error is not shown");
		assert(t === 2,"low priority listener is executing");
		done();
	});
});