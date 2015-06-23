/* eslint-env mocha */

"use strict";

var core = new (require("../ebus"))({
	high: 900,
	low: 100
});

core.setDebug(true);

it ('should abort when error is thrown', function (done) {
	core.on('e', function (o, next) {
		console.log("Called :(");
//		done(Error("This should not have been called"));
	}, 'low');
	

	core.on('e', function (o, next) {
		console.log("2");
		process.nextTick(next);
		process.nextTick(next);
//		next();
//		next();
	}, 'high');	
	
	
	core.on('e', function (o, next) {
		console.log("1");
//		next(Error('ERR_TO_CATCH'));
		setTimeout(function () {
			next(Error('ERR_TO_BE_CAUGHT'));
		}, 500);
	}, 'high');

	
	core.emit('e', {}, function (err, obj) {
		console.log("CB got ", err, obj);
		done();
	});
});