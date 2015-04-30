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

function Ebus(p) {
	this.debug = false;
	this.handlers = {};

	if (p) {
		this.priorities = p;
	} else {
		this.priorities = {};
	}
}

Ebus.prototype.on = function(event, p1, p2) {
	var i, line="", index, err, handle;
	var pos = 0, len;
	var callback, priority;

	if (typeof p1 === 'function') {
		callback = p1;
		priority = p2;
	} else {
		callback = p2;
		priority = p1;
	}

	if(this.debug){
		err = new Error();

		if(err.stack) {
			line = err.stack.split("\n")[2];
			index = line.lastIndexOf("/");
			line = event + " handler at " + line.substring(index+1);
		} else {
			line = event + " handler at " + priority;
		}
	}

	if (typeof priority != "number" && typeof priority != "string") throw new Error("INVALID_PARAMETERS");
	if (typeof priority === 'string') priority = this.priorities[priority];

	if (typeof callback !== 'function') throw new Error("INVALID_LISTENER");
	if (!this.handlers[event]) this.handlers[event] = [];

	len = this.handlers[event].length;

	handle = {
        fn: callback,
		async: callback.length >= 2,
        priority: priority,
		line: line
    };

	if (len && priority < this.handlers[event][len - 1].priority) {
		this.handlers[event].push(handle);
	} else {
		for(i = 0; i < len; i++) {
			pos = i;
			if (this.handlers[event][i].priority <= priority){
				break;
			}
		}

		this.handlers[event].splice(pos, 0, handle);
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
	var listeners, i = -1, debug = this.debug;
	
	if (this.handlers[event]) {
		listeners = this.handlers[event];
	} else {
		if (cb) return cb(null, data);
	}
	
	function fire(err) {
		if (err) {
			if (cb) {
				return cb(err, data);
			} else {
				return;
			}
		}
		
		i++;
		
		if (debug) {
			console.log("calling " + i + ": " + listeners[i].line);
		}
		
		if (i<listeners.length) {
			if(listeners[i].async) {
				listeners[i].fn(data, fire);
			} else {
				listeners[i].fn(data);
				fire();
			}
		} else {
			if (cb) cb(null, data);
		}
	}
	
	fire();
	
	if (debug) {
		setTimeout(function () {
			console.log(listeners[i].line + " may not have called next.");
		}, 5000);
	}
};

Ebus.prototype.setDebug = function(flag) {
	this.debug = flag;
};

module.exports = Ebus;
