# @oglofus/event-manager [![Publish Package to NPM](https://github.com/oglofus/event-manager/actions/workflows/release-package.yml/badge.svg)](https://github.com/oglofus/event-manager/actions/workflows/release-package.yml)

A lightweight, strongly-typed event management library for TypeScript and JavaScript. It provides:

- Simple Event and CancellableEvent base classes
- Priority-based handlers (lower number = higher priority)
- Easy registration/unregistration of handlers
- Emission metrics (execution time, executed handlers, etc.)

Works great for applications, libraries, and tools that need a small but capable event system.


## Installation

- npm: `npm install @oglofus/event-manager`
- pnpm: `pnpm add @oglofus/event-manager`
- yarn: `yarn add @oglofus/event-manager`
- bun: `bun add @oglofus/event-manager`

Requires Node.js with native ESM support. TypeScript types are included.


## Quick start

TypeScript example:

```ts
import { EventManager, Event, CancellableEvent, EventPriority } from '@oglofus/event-manager';

// 1) Define your event types
class UserRegistered extends Event {
  constructor(public readonly username: string) { super(); }
}

class EmailDispatch extends CancellableEvent {
  constructor(public readonly email: string) { super(); }
}

// 2) Create an EventManager
const bus = new EventManager();

// 3) Register handlers (optionally with priorities)
const id = bus.register(UserRegistered, (e) => {
  console.log('Welcome,', e.username);
}, EventPriority.NORMAL);

bus.register(UserRegistered, async (e) => {
  // async handlers are supported
  await new Promise(r => setTimeout(r, 50));
  console.log('Async handler ran for', e.username);
}, EventPriority.HIGH);

// 4) Emit events
const result = await bus.emit(new UserRegistered('alice'));
console.log('Executed handlers:', result.handlerCount);
console.log('Total execution time (ms):', result.executionTime);

// 5) Cancellable events
bus.register(EmailDispatch, (e) => {
  if (!e.email.endsWith('@example.com')) {
    e.cancel('Only example.com emails are allowed');
  }
}, EventPriority.HIGHEST);

bus.register(EmailDispatch, () => {
  // This will not run if the event was cancelled above
  console.log('Sending email...');
}, EventPriority.NORMAL);

const emailResult = await bus.emit(new EmailDispatch('user@other.com'));
console.log('Email handlers executed:', emailResult.handlerCount); // likely 1
```


## Unregistering and inspection

```ts
// Register and capture handler IDs
const h1 = bus.register(UserRegistered, () => {/*...*/}, EventPriority.NORMAL);
const h2 = bus.register(UserRegistered, () => {/*...*/}, EventPriority.LOW);

// Unregister a single handler by ID
bus.unregister(h1);

// Unregister all handlers for a specific event
bus.unregisterAll(UserRegistered);

// Or clear everything
bus.unregisterAll();

// Remove only a specific priority for an event type
bus.unregisterByPriority(UserRegistered, EventPriority.LOW);

// Introspection
bus.getHandlerIds(UserRegistered); // => string[]
bus.hasHandlers(UserRegistered);   // => boolean
bus.getHandlerCount(UserRegistered); // => number
```


## API overview

- EventPriority
  - MONITOR = 0
  - HIGHEST = 1
  - HIGH = 2
  - NORMAL = 3
  - LOW = 4
  - LOWEST = 5
  - Lower numeric value means higher priority; handlers run in ascending order.

- abstract class Event
  - Base class for all events.

- abstract class CancellableEvent extends Event
  - isCancelled(): boolean
  - getCancelReason(): string
  - cancel(reason?: string): void
  - When an emitted event is cancellable and isCancelled() becomes true, further handlers are skipped.

- class EventManager
  - register<T extends Event>(eventClass, handler, priority = EventPriority.NORMAL): string
  - unregister(handlerId: string): boolean
  - unregisterAll<T extends Event>(eventClass?: new (...args: any[]) => T): void
  - unregisterByPriority<T extends Event>(eventClass, priority: EventPriority): void
  - getHandlerIds<T extends Event>(eventClass): string[]
  - hasHandlers<T extends Event>(eventClass): boolean
  - getHandlerCount<T extends Event>(eventClass): number
  - emit<T extends Event>(event: T): Promise<EventResult<T>>

- interface EventResult<T extends Event>
  - event: T
  - handlerCount: number
  - executionTime: number // ms
  - executedHandlers: Array<{ priority: EventPriority; handlerId: string; executionTime?: number }>


## Usage with JavaScript (ESM)

```js
import { EventManager, Event, EventPriority } from '@oglofus/event-manager';

class Ping extends Event {}

const bus = new EventManager();
bus.register(Ping, () => console.log('pong'), EventPriority.NORMAL);
await bus.emit(new Ping());
```


## Development

- Build: `npm run build` (outputs to `dist/`)
- TypeScript config: `tsconfig.json`


## License

ISC License. See the LICENSE file for details.


## Links

- Repository: https://github.com/oglofus/event-manager
- NPM: https://www.npmjs.com/package/@oglofus/event-manager
