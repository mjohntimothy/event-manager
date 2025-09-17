import test from 'node:test';
import assert from 'node:assert/strict';

import {
  Event,
  CancellableEvent,
  EventManager,
  EventPriority
} from '../dist/index.js';

class MyEvent extends Event {
  constructor(payload) {
    super();
    this.payload = payload;
  }
}

class MyCancellableEvent extends CancellableEvent {
  constructor() {
    super();
  }
}

test('register and emit: handlers execute in priority order', async () => {
  const em = new EventManager();
  const order = [];

  em.register(MyEvent, () => order.push('low'), EventPriority.LOWEST);
  em.register(MyEvent, () => order.push('high'), EventPriority.HIGH);
  em.register(MyEvent, () => order.push('monitor'), EventPriority.MONITOR);

  const result = await em.emit(new MyEvent('x'));

  assert.deepEqual(order, ['monitor', 'high', 'low']);
  assert.equal(result.handlerCount, 3);
  assert.equal(result.executedHandlers.length, 3);
  assert.deepEqual(result.executedHandlers.map(h => h.priority), [
    EventPriority.MONITOR,
    EventPriority.HIGH,
    EventPriority.LOWEST
  ]);
});

test('cancellable event: stops further handler execution and keeps reason', async () => {
  const em = new EventManager();
  const calls = [];

  em.register(MyCancellableEvent, (e) => {
    calls.push('first');
    e.cancel('stop-now');
  }, EventPriority.NORMAL);

  em.register(MyCancellableEvent, () => {
    calls.push('second-should-not-run');
  }, EventPriority.LOW);

  const ev = new MyCancellableEvent();
  const result = await em.emit(ev);

  assert.equal(ev.isCancelled(), true);
  assert.equal(ev.getCancelReason(), 'stop-now');
  assert.deepEqual(calls, ['first']);
  assert.equal(result.handlerCount, 1);
});

test('unregister by id removes the handler', async () => {
  const em = new EventManager();
  const calls = [];

  const id1 = em.register(MyEvent, () => calls.push('first'));
  em.register(MyEvent, () => calls.push('second'));

  const removed = em.unregister(id1);
  assert.equal(removed, true);

  await em.emit(new MyEvent('x'));

  assert.deepEqual(calls, ['second']);
  assert.equal(em.getHandlerCount(MyEvent), 1);
  assert.equal(em.hasHandlers(MyEvent), true);
});

test('unregisterAll for a specific event clears only that event', async () => {
  const em = new EventManager();
  em.register(MyEvent, () => {});

  class AnotherEvent extends Event {}
  em.register(AnotherEvent, () => {});

  assert.equal(em.getHandlerCount(MyEvent), 1);
  assert.equal(em.getHandlerCount(AnotherEvent), 1);

  em.unregisterAll(MyEvent);

  assert.equal(em.getHandlerCount(MyEvent), 0);
  assert.equal(em.getHandlerCount(AnotherEvent), 1);
});

test('unregisterByPriority removes all handlers with given priority', async () => {
  const em = new EventManager();
  em.register(MyEvent, () => {}, EventPriority.HIGH);
  em.register(MyEvent, () => {}, EventPriority.HIGH);
  em.register(MyEvent, () => {}, EventPriority.LOW);

  assert.equal(em.getHandlerCount(MyEvent), 3);

  em.unregisterByPriority(MyEvent, EventPriority.HIGH);

  assert.equal(em.getHandlerCount(MyEvent), 1);
  const ids = em.getHandlerIds(MyEvent);
  assert.equal(Array.isArray(ids), true);
  assert.equal(ids.length, 1);
});
