/* Bus - A generic event bus
 *
 * Use var myObj = new require('ebus')(); to inherit the functions
 * Use myObj.on('event', callback) to attach event handlers
 * Use emit('event', data, callback) to trigger the event handlers
 *
 *   Each listener is called with two parameters, data and a function.
 *
 *   Listeners are expected to call the function with no parameters
 *   if they are successful, and with an error object to stop the
 *   event from propagating to downstream listeners.
 *
 *   Finally, the callback passed to emit itself will be called, either
 *   with no arguments, if all handlers were successful, or with
 *   the error object returned by the listener which failed.
 */

/* global performance */

require("setimmediate"); // polyfills the global setImmediate

function Ebus(p) {
	this.debug = false;
	this.yields = false;
	this.handlers = {};

	if (p) {
		this.priorities = p;
	} else {
		this.priorities = {};
	}
}

Ebus.prototype.on = function(event, p1, p2) {
	var i, line="", stack, handle,
		len;
	var callback, priority;

	if (typeof p1 === 'function') {
		callback = p1;
		priority = p2;
	} else {
		callback = p2;
		priority = p1;
	}

	if(this.debug){
		stack = new Error().stack;
		line = event +":" + priority + " " + callback.name;
		if(stack) {
			line = line + "@" + stack.split("\n")[2].
				replace(/^.*\//, "").
				replace(/\:[^:]*$/, "");
		}
	}

	if (typeof priority != "number" && typeof priority != "string") {
		throw new Error("INVALID_PARAMETERS");
	}
	
	if (typeof priority === 'string') {
		priority = this.priorities[priority];
	}

	if (typeof callback !== 'function') {
		throw new Error("INVALID_LISTENER");
	}
	
	if (!this.handlers[event]) {
		this.handlers[event] = [];
	}

	len = this.handlers[event].length;

	handle = {
        fn: callback,
		async: callback.length >= 2,
        priority: priority,
		line: line
    };

	if (!len || priority <= this.handlers[event][len - 1].priority) {
		this.handlers[event].push(handle);
	} else {
		for(i = len-1; i >= 0 && this.handlers[event][i].priority < priority; i--) {}
		this.handlers[event].splice(i+1, 0, handle);
	}

};

Ebus.prototype.off = function(event, cb) {
	if (this.handlers[event]) {
		for (var i = 0, l = this.handlers[event].length; i < l; i++) {
			if (this.handlers[event][i].fn === cb) {
				this.handlers[event].splice(i, 1);

				break;
			}
		}
	}
};

Ebus.prototype.emit = function(event, data, cb) {
	var listeners,
		i = 0, li, fn, n = 0, prio, 
		debug = this.debug, 
		yields = this.yields,
		actuallySync = false,
		calledBack = false;
	
	if (this.handlers[event]) {
		listeners = this.handlers[event];
	} else {
		if (cb) { return cb(null, data); }
	}
	
	function error(err) {
		calledBack = true;
		if (cb) {
			return cb(err, data);
		} else {
			return;
		}
	}
	
	function fire(err) {
		if(calledBack) {
			if(debug) { console.log("Possible duplicate callback or error at priority " + prio) }
			return;
		}
		
		if (err) {
			if(debug) { console.log("Received error", prio); }
			return error(err);
		}
		
		if(n > 0) { n--; }
		if(actuallySync) {
			if(debug) { console.log(listeners[i].line + "can be made async to improve performance."); }
			return;
		};
		if(n > 0) { return; }
		
		prio = listeners[i] && listeners[i].priority;
				
		while(true) {
			if (i >= listeners.length) {
				if (n === 0 && cb) {
					calledBack = true;
					cb(null, data);
				}
				return;
			}
			
			li = listeners[i];
						
			if(li.priority !== prio) {
				if(n > 0) {
					// if an async listener has been fired, wait for it to be done.
					break;
				} else {
					// otherwise, bump the prio and keep looping
					prio = li.priority;
				}
			}
			
		
			if (debug) {
				console.log("calling " + li.line);
			}
			
			fn = li.fn;
			
			if(li.async) {
				n++;
				actuallySync = true;
				if(debug) {
					if(yields) {
						setImmediate(wrapAsync(fn, data, wrapFire(li.line)));
					} else {
						fn(data, wrapFire(li.line));
					}
				} else {
					if(yields) {
						setImmediate(wrapAsync(fn, data, fire));
					} else {
						fn(data, fire);
					}
				}
				actuallySync = false;
			} else {
				if(yields) {
					n++;
					setInterval(wrapSync(fn, data));
				} else {
					fn(data);
				}
			}
			
			
						i++;

		}
	}
	
	function wrapFire(line) {
		var start = process? process.hrtime() : performance? performance.now() : Date.now();
		
		return function (err) {
			console.log(line + " took " + (
				process? process.hrtime(start)[1]/1000000 : (performance? performance.now() : Date.now()) - start
			));
			fire(err);
		};
	}
	
	function wrapAsync(fn, data, cb) {
		return function () { fn(data, cb); };
	}
	
	function wrapSync(fn, data) {
		return function () {
			fn(data);
			fire();
		}
	}
	
	try {
		fire();
	} catch (err) {
		error(err);
	}
	
	if (debug) {
		setTimeout(function () {
			console.log(listeners[i].line + " may not have called next.");
		}, 5000);
	}
};

Ebus.prototype.setDebug = function(flag) {
	this.debug = flag;
};

Ebus.prototype.setYields = function(flag) {
	this.yields = flag;
};

Ebus.prototype.dump = function (event) {
	console.log(this.handlers[event].map(function (handler) {
		return handler.line;
	}).join("\n"));
};

module.exports = Ebus;
