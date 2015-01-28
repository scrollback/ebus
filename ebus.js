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

var debug = false;

function fire(listeners, data, i, cb) {
    if (i < listeners.length) {

        if (debug){
            if (listeners[i].line) {
                console.log("calling " + i + ":" + listeners[i].line);
            } else {
                console.log("Unable to get handler line number");
            }
        }

        if (listeners[i].sync) {
            try {
                listeners[i].fn(data);
            } catch(e) {
                if (cb) {
                    return cb(e, data);
                } else {
                    return;
                }
            }

            return process.nextTick(function() { fire(listeners, data, i + 1, cb); });
        } else {
            listeners[i].fn(data, function(err /*, res */) {
                if (err) {
                    if (cb) {
                        return cb(err, data);
                    } else {
                        return;
                    }
                }

                return process.nextTick(function() { fire(listeners, data, i + 1, cb); });
            });
        }
    } else {
        if (cb) cb(null, data);
    }
}

function Ebus(priorities) {
    this.handlers = {};

    if (priorities) {
        this.priorities = priorities;
    } else {
        this.priorities = {};
    }
}

Ebus.prototype.on = function(event, callback, priority) {
    var line, index, err,
        self = this,
        addHandler = function(event, callback, priority, debugLine) {
        var i, len, handle,
            pos = 0,
            sync = (callback.length < 2) ? true : false;

        if (typeof priority === 'string') priority = this.priorities[priority];

        if (!(priority || sync)) throw new Error("INVALID_PARAMETERS");

        if (typeof callback !== 'function') throw new Error("INVALID_LISTENER");

        if (!this.handlers[event]) this.handlers[event] = [];

        len = this.handlers[event].length;

        handle = { fn: callback, priority: priority, sync: sync };

        if (debugLine) handle.line = debugLine;

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
    }.bind(this);

    if(debug){
        err = new Error();
        if(err.stack) {
            line = err.stack.split("\n")[2];
            index = line.lastIndexOf("/");
            line = event + " handler at " + line.substring(index+1);
        }
    }

    event.split(/\s+/).forEach(function(eventPrio) {
        var thisPrio;

        eventPrio = eventPrio.split(':');

        if (eventPrio.length > 1) {
            thisPrio = parseInt(eventPrio[1]);

            if (isNaN(thisPrio)) thisPrio = eventPrio[1];
        } else {
            thisPrio = priority;
        }

        addHandler(eventPrio[0], callback, thisPrio, line);
    });
};

Ebus.prototype.emit = function emit(event, data, cb) {
    if (this.handlers[event]) {
        fire(this.handlers[event], data, 0, cb);
    } else {
        if (cb) cb();
    }
};

module.exports = Ebus;
