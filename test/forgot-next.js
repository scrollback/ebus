var assert = require("assert");
var core = new (require("../ebus"))({
	high: 900,
	low: 100,
	lower: 1
});

core.setDebug(1);

it ('should show stuff when you forget next', function (done) {
	
	this.timeout(6000);
	core.on('e', function failer (o, next) {
		// forgot next.
		setTimeout(function () {
			console.log("There should be a debug message showing that the failer is still running.");
			done();
		}, 5500);
	}, 'low');
	
	core.on('e', function low_nofail (o, next) {
		next();
	}, 'low');
	
	core.on('e', function highest (o, next) {
		next();
	}, 'high');

	core.on('e', function lowest (o, next) {
		assert.fail('lower prio callback should not be called.');
	}, 'lower');
	
	core.emit('e', {}, function (err, obj) {
		console.log("CB got ", err, obj);
		assert.fail("it should not call back if someone forgot next");
	});
});