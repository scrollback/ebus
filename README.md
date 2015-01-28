ebus
====

A simple, sequential event bus


```javascript
    bus.on('event', function (data, next) { ... }, prio);

    bus.on('event', function (data) { ... }, prio); // function is assumed synchronous.

    bus.on('event:prio event2:prio2', function (data, [next]) {}); // handler is attached to multiple events at the priorities specified.

    bus.on('event1 event2', function (data) {}) // attach at the end (priority 0)

```
