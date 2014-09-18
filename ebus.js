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

function fire(listeners, data, i, cb) {
    if (i < listeners.length) {
        if (debug){
            if (listeners[i].line) console.log("calling " + i + ":" + listeners[i].line);
            else console.log("Unable to get handler line number");
        }
        listeners[i].fn(data, function(err /*, res */) {
            if (err) {
                if (cb) return cb(err, data);
                else return;
            }
            return fire(listeners, data, i + 1, cb);
        });
    } else {
        if (cb) cb(null, data);
    }
}

var debug = false;

function Ebus(p) {
    this.handlers = {};
    if(p) this.priorities = p;
    else this.priorities = {};
}

Ebus.prototype.on = function(event, p1, p2) {
    var i, line, index, err, handle;
    var pos = 0, len;
    var callback, priority;
    
    if (typeof p1 === 'function') {
        callback = p1;
        priority = p2;
    } else {
        callback = p2;
        priority = p1;
    }
    if(debug){
        err = new Error();
        if(err.stack) {
            line = err.stack.split("\n")[2];
            index = line.lastIndexOf("/");
            line = event + " handler at " + line.substring(index+1);
        }
    }

    if (!priority) throw new Error("INVALID_PARAMETERS");
    else if(typeof priority === 'string') priority = this.priorities[priority];

    if(typeof callback !== 'function') throw new Error("INVALID_LISTENER");
    if(!this.handlers[event]) this.handlers[event] = [];
    len = this.handlers[event].length;

    handle = {fn: callback, priority: priority};
    if (line) handle.line = line;

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

Ebus.prototype.emit = function emit(event, data, cb) {
    if (this.handlers[event]) {
        fire(this.handlers[event], data, 0, cb);
    } else {
        if (cb) cb();
    }
};

module.exports = Ebus;
