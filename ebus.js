/* Bus - A generic event bus
 *
 * Use var myObj = new require("ebus")(); to inherit the functions
 * Use myObj.on("event", callback) to attach event handlers
 * Use emit("event", data, callback) to trigger the event handlers
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
/* eslint-env node */


/* 
	Debug levels
	0 - None
	1 - Definite problem, e.g. calling next twice
	2 - Likely problem, e.g. thrown error
	3 - Possible problem, e.g. error in callback
	4 - Trace execution path through ebus
	5 - Log performance
	
	Each level includes all the messages from lower levels.
*/
require("setimmediate"); // polyfills the global setImmediate

function Ebus(p) {
	"use strict";
	
	this.debug = false;
	this.yields = false;
	this.handlers = {};

	if (p) {
		this.priorities = p;
	} else {
		this.priorities = {};
	}
}

Ebus.prototype.on = function (event, p1, p2) {
	"use strict";
	
	var i, line = "", stack, handle,
		len, callback, priority;

	if (typeof p1 === "function") {
		callback = p1;
		priority = p2;
	} else {
		callback = p2;
		priority = p1;
	}

	if (this.debug) {
		stack = new Error().stack;
		line = event + ":" + priority + " " + callback.name;
		if (stack) {
			line = line + "@" + stack.split("\n")[2].
				replace(/^.*\//, "").
				replace(/\:[^:]*$/, "");
		}
	}

	if (typeof priority === "string") {
		priority = this.priorities[priority];
	}

	if (typeof priority !== "number") {
		priority = 0;
//		throw new Error("EBUS_INVALID_PRIORITY");
	}
	
	if (typeof callback !== "function") {
		throw new Error("EBUS_INVALID_LISTENER");
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
		for(i = len - 1; i >= 0; i--) {
			if(this.handlers[event][i].priority >= priority) { break; }
		}
		this.handlers[event].splice(i + 1, 0, handle);
	}

};

Ebus.prototype.off = function(event, cb) {
	"use strict";
	
	var i, l;
	
	if (this.handlers[event]) {
		for (i = 0, l = this.handlers[event].length; i < l; i++) {
			if (this.handlers[event][i].fn === cb) {
				this.handlers[event].splice(i, 1);

				break;
			}
		}
	}
};

Ebus.prototype.emit = function(event, data, cb) {
	"use strict";
	
	var listeners = this.handlers[event] || [],
		status = {},
		i = 0,
		runningCount = 0,
		calledBack = false,
		li,
		prio,
		
		debug = this.debug, 
		timer,
		
		RUNNING = 1,
		SUCCESS = 2,
		ERROR = 3;
	
	if (!listeners) {
		if (cb) { cb(null, data); }
		return;
	}
	
	function success () {
		if(timer) { clearTimeout(timer); }
		calledBack = true;
		
		if(cb) {
			setImmediate(function () { cb(null, data); });
		}
		
		return;
	}
	
	function error(err) {
		if(timer) { clearTimeout(timer); }
		calledBack = true;
		
		if (cb) { 
			setImmediate(function () { cb(err, data); }); 
		}
		return;
	}
	
	function dumpStatus() {
		for(var j in status) {
			console.log(listeners[j].line + " -- " + ["Running", "Success", "Error"][status[j] - 1]);
		}
	}
	
	function getNext(prevIx) {
		var start;
		
		if(typeof prevIx !== "undefined") { // Skip when invoking first listener
			status[prevIx] = RUNNING;
			runningCount++;

			if(debug) {
				start = process && process.hrtime ? process.hrtime() : performance ? performance.now() : Date.now();
			}
		}
		
		return function (err) {
			if(typeof prevIx !== "undefined") { // Skip when invoking first listener
				if(debug > 4) {
					console.log(listeners[prevIx].line + " called next after " + (
						process && process.hrtime ? process.hrtime(start)[1] / 1000000 : (performance ? performance.now() : Date.now()) - start
					));
				}
				
				if(calledBack) {
					if(debug > 0) { console.log("Next() after emit called back" + listeners[prevIx].line); }
					return;
				}

				if(status[prevIx] !== RUNNING) {
					if(debug > 0) { console.log("Multiple next() from " + listeners[prevIx].line); }
					throw Error("EBUS_MULTIPLE_NEXT");
				}

				if (err) {
					status[prevIx] = ERROR;
					if(debug > 2) { console.log("Received error from " + listeners[prevIx].line + ":\n", err); }
					error(err);
					return;
				}

				status[prevIx] = SUCCESS;

				if(runningCount > 0) { runningCount--; }
				if(prevIx === i) {
					if(debug > 4) { console.log("Sync callback from " + listeners[i].line + "; if possible, remove callback for better perf."); }
					return;
				}
				if(runningCount > 0) { return; }
			}

			prio = listeners[i] && listeners[i].priority;
		
			while(true) {
				if (i >= listeners.length) {
					if (runningCount === 0) {
						success(data);
					}
					return;
				}

				li = listeners[i];

				if(li.priority !== prio) {
					if(runningCount > 0) {
						// if an async listener has been fired, wait for it to be done.
						break;
					} else {
						// otherwise, bump the prio and keep looping
						prio = li.priority;
					}
				}

				if (debug > 3) { console.log("Calling " + li.line); }

				if(li.async) {
					li.fn.call(null, data, getNext(i));
				} else {
					li.fn.call(null, data);
				}

				i++;
			}
		};
	}
	
	if (debug > 0) {
		timer = setTimeout(function () {
			console.log("Emit timed out. Status:");
			dumpStatus();
		}, 5000);
	}
	
	getNext()();
};

Ebus.prototype.setDebug = function(level) {
	"use strict";
	if(level === false) {
		level = 0;
	} else if(level === true) {
		level = 5;
	}
	this.debug = level;
};

Ebus.prototype.setYields = function(flag) {
	"use strict";
	console.log("Yields is not yet supported");
	this.yields = flag;
};

Ebus.prototype.dump = function (event) {
	"use strict";
	console.log(this.handlers[event].map(function (handler) {
		return handler.line;
	}).join("\n"));
};

module.exports = Ebus;
