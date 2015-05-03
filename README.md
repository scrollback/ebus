ebus
====

A high performance event bus, designed as a centralized data flow switchboard in Scrollback. It's in production use both on client and server.

On the client, it serves a similar role as the Flux Dispatcher.

## Isn't this PubSub? ## 

It can be used that way, but it does a few more things.

1. Subscribers can be triggered in a predetermined sequence or in parallel
2. Subscribers can modify the payload before passing it to downstream subscribers
3. Subscribers can throw errors to stop propagation to other subscribers

Unlike Flux's Dispatcher, ebus allows multiple events with different subscriber lists, and supports asynchronous subscribers.

## Current API ##

```javscript
var bus = require("ebus")();
bus.on("event", callback, priority);
bus.emit("event", data, callback);
bus.off("event", callback);

// debugging
bus.setDebug(bool); // 
bus.dump("event");  // logs the listeners in sequence
```

## Proposed API ##

```javascript
bus.on("event", callback).after("target1", "traget2").before("target3");

bus.on("event1 target1> target2> <target3, event2 target3>", callback);
```

