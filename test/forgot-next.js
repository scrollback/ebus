var core = new (require("../ebus"))({
	high: 900,
	low: 100
});

core.setDebug(true);

it ('should show stuff when you forget next', function (done) {
	
	this.timeout(10000);
	core.on('e', function (o, next) {
		console.log("Called :(");
	}, 'low');
	
	core.on('e', function (o, next) {
		console.log("Called :(");
		next();
	}, 'low');
	
	core.on('e', function (o, next) {
		console.log("Called :(");
		next()
	}, 'high');
	
	core.emit('e', {}, function (err, obj) {
		console.log("CB got ", err, obj);
		done();
	});
});