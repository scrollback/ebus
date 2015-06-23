var listeners = [
	function (obj) {
		return obj;
	},

	function (obj, next) {
		next();
	},

	function (obj, next) {
		process.nextTick(next);
	}
];

function emit1(obj, cb) {
	
	function getNext(i) {
		return function (err) {
			if(i>999999) return cb();
			listeners[2](obj, getNext(i+1));
		}
	}
	
	getNext(0)();
}

function emit2(obj, cb) {
	var i = -1;
	function fire(err) {
		i++;
		if(i>999999) return cb();
		listeners[2](obj, fire);
	}
	
	fire();
}

var p;

p = Date.now();
emit1({}, function () {
	console.log("Emit1", Date.now() - p);
});


p = Date.now();
emit2({}, function () {
	console.log("Emit2", Date.now() - p);
});

