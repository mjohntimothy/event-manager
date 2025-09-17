/**
 * Represents the priority levels for events in a system.
 *
 * EventPriority is used to define the order in which events are processed,
 * with lower numeric values indicating higher priority.
 *
 * Enum values:
 * - MONITOR: Indicates the highest priority level (value: 0). Typically used for monitoring
 * purposes.
 * - HIGHEST: Represents a very high priority level (value: 1).
 * - HIGH: Defines a high priority level (value: 2).
 * - NORMAL: Represents the standard or default priority level (value: 3).
 * - LOW: Indicates a lower priority level (value: 4).
 * - LOWEST: Represents the lowest priority level (value: 5).
 */
export enum EventPriority {
    MONITOR = 0, HIGHEST = 1, HIGH = 2, NORMAL = 3, LOW = 4, LOWEST = 5
}

/**
 * Represents the result of handling an event.
 *
 * @template T The specific type of the event associated with this result.
 *
 * @property {T} event The event instance associated with this result.
 * @property {number} handlerCount The total number of handlers associated with the event.
 * @property {number} executionTime The total time taken to execute all handlers, in milliseconds.
 * @property {Array<{ priority: EventPriority, handlerId: string, executionTime?: number }>}
 *     executedHandlers A collection of metadata for each executed handler, including its priority,
 *     unique identifier, and optional execution time.
 */
export interface EventResult<T extends Event> {
    event: T;
    handlerCount: number;
    executionTime: number;
    executedHandlers: Array<{
        priority: EventPriority;
        handlerId: string;
        executionTime?: number;
    }>;
}

/**
 * Represents metadata for an event handler.
 *
 * @template TEvent The type of event handled.
 */
export interface EventHandlerMetadata<TEvent> {
    handler: (event: TEvent) => Promise<void> | void;
    priority: EventPriority;
    id: string;
}

/**
 * Represents a generic event in an abstract form. This class serves as
 * a base class for defining various types of events within an application.
 * It is expected to be extended by concrete event classes to hold specific
 * event-related data and provide relevant functionality.
 *
 * This class does not implement any behavior itself, as it acts as a
 * blueprint for defining custom events. Subclasses should define
 * properties and methods corresponding to their specific needs.
 */
export abstract class Event {}

/**
 * Represents an abstract event that can be cancelled.
 * This class extends the base `Event` class, adding functionality
 * to handle cancellation and provide a reason for it.
 *
 * The event can be flagged as cancelled using the `cancel` method,
 * and the status or reason for cancellation can be retrieved using
 * the corresponding getter methods.
 *
 * Subclasses should inherit and expand upon this class to define
 * specific cancellable events within the application.
 */
export abstract class CancellableEvent extends Event {
    /**
     * Represents the cancellation status of an operation or process.
     * A value of `true` indicates that the operation has been cancelled,
     * while `false` indicates it is still active or ongoing.
     */
    private cancelled: boolean = false;
    /**
     * Represents the reason for cancellation.
     *
     * This variable is used to store the reason provided for cancelling a specific action or
     * operation. It is intended to be a descriptive string explaining the cause of cancellation.
     */
    private cancelReason: string = '';

    /**
     * Determines whether an operation or process has been cancelled.
     *
     * @return {boolean} True if the operation is cancelled; otherwise, false.
     */
    isCancelled(): boolean {
        return this.cancelled;
    }

    /**
     * Retrieves the reason for cancellation.
     *
     * @return {string} The cancellation reason.
     */
    getCancelReason(): string {
        return this.cancelReason;
    }

    /**
     * Cancels the current process or operation and optionally sets a reason for cancellation.
     *
     * @param {string} reason - An optional string describing the reason for cancellation. Defaults
     *     to an empty string if not provided.
     * @return {void} This method does not return any value.
     */
    cancel(reason: string = ''): void {
        this.cancelled = true;
        this.cancelReason = reason;
    }
}

/**
 * Manages the registration, unregistration, and execution of event handlers.
 * Provides mechanisms to prioritize handlers, retrieve handler information,
 * and trigger events to execute associated handlers in order of priority.
 */
export class EventManager {
    /**
     * A map that holds event listeners grouped by their event names.
     *
     * @type {Map<string, EventHandlerMetadata<any>[]>}
     * - The key represents the event name as a string.
     * - The value is an array of `EventHandlerMetadata` objects, which hold metadata about event handler functions.
     *
     * This map is used to register and organize event handlers according to the events they are associated with.
     */
    protected listeners: Map<string, EventHandlerMetadata<any>[]> = new Map();
    /**
     * A numeric variable used to count the number of handlers.
     * This counter is typically incremented or decremented
     * to track the active or total number of handlers in a system.
     */
    protected handlerCounter: number = 0;

    /**
     * Registers an event handler for a specific event type.
     *
     * @param {new (...args: any[]) => T} eventClass - The class of the event to listen for.
     * @param {(event: T) => Promise<void> | void} handler - The function that will be executed when the event is triggered.
     * @param {EventPriority} [priority=EventPriority.NORMAL] - The priority of the event handler. Handlers with higher priority are executed earlier.
     * @return {string} The unique ID of the registered handler.
     */
    public register<T extends Event>(
        eventClass: new (...args: any[]) => T,
        handler: (event: T) => Promise<void> | void,
        priority: EventPriority = EventPriority.NORMAL
    ): string {
        const eventName = eventClass.name;

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }

        const handlerId = `handler_${++this.handlerCounter}`;
        const handlers = this.listeners.get(eventName)!;

        handlers.push({ handler, priority, id: handlerId });
        handlers.sort((a, b) => a.priority - b.priority);

        return handlerId;
    }

    /**
     * Unregisters a handler by its unique identifier.
     *
     * @param {string} handlerId - The unique identifier of the handler to unregister.
     * @return {boolean} Returns true if the handler was successfully unregistered, otherwise false.
     */
    public unregister(handlerId: string): boolean {
        let removed = false;

        for (const [eventName, handlers] of this.listeners.entries()) {
            const index = handlers.findIndex((h) => h.id === handlerId);

            if (index !== -1) {
                handlers.splice(index, 1);
                removed = true;

                if (handlers.length === 0) {
                    this.listeners.delete(eventName);
                }

                break;
            }
        }

        return removed;
    }

    /**
     * Unregisters all listeners associated with a specific event class or all listeners if no event class is provided.
     *
     * @param {Function} [eventClass] - The class of the event whose listeners need to be unregistered. If omitted, all listeners will be cleared.
     * @return {void} - Does not return a value.
     */
    public unregisterAll<T extends Event>(eventClass?: new (...args: any[]) => T): void {
        if (eventClass) {
            this.listeners.delete(eventClass.name);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Unregisters all event handlers of a specific priority for the given event class.
     *
     * @param eventClass - The event class for which the handlers should be unregistered.
     * @param priority - The priority level of the handlers to be removed.
     * @return void
     */
    public unregisterByPriority<T extends Event>(
        eventClass: new (...args: any[]) => T,
        priority: EventPriority
    ): void {
        const eventName = eventClass.name;
        const handlers = this.listeners.get(eventName);

        if (handlers) {
            const filteredHandlers = handlers.filter((h) => h.priority !== priority);

            if (filteredHandlers.length === 0) {
                this.listeners.delete(eventName);
            } else {
                this.listeners.set(eventName, filteredHandlers);
            }
        }
    }

    /**
     * Retrieves a list of handler IDs associated with a specific event class.
     *
     * @param eventClass The class of the event for which to retrieve handler IDs.
     * @return An array of handler IDs associated with the given event class. Returns an empty array if no handlers are found.
     */
    public getHandlerIds<T extends Event>(eventClass: new (...args: any[]) => T): string[] {
        const eventName = eventClass.name;

        return this.listeners.get(eventName)?.map((h) => h.id) || [];
    }

    /**
     * Checks if there are any handlers registered for a given event type.
     *
     * @param eventClass The class of the event for which handlers are being checked.
     * @return `true` if there are one or more handlers registered for the specified event type, otherwise `false`.
     */
    public hasHandlers<T extends Event>(eventClass: new (...args: any[]) => T): boolean {
        const eventName = eventClass.name;

        return this.listeners.has(eventName) && this.listeners.get(eventName)!.length > 0;
    }

    /**
     * Retrieves the count of registered handlers for a specific event class.
     *
     * @param eventClass The class of the event for which the handler count is required.
     * @return The number of registered handlers for the specified event class.
     */
    public getHandlerCount<T extends Event>(eventClass: new (...args: any[]) => T): number {
        const eventName = eventClass.name;

        return this.listeners.get(eventName)?.length || 0;
    }

    /**
     * Emits an event to all registered listeners for the event type. Handlers are executed
     * in the order of their priority, and execution stops if the event is cancellable and marked as cancelled.
     *
     * @param {T} event The event object to be emitted. The event must extend the base `Event` class.
     * @return {Promise<EventResult<T>>} A promise that resolves with the result of the event emission,
     * including details on the number of handlers executed, execution time, and handler execution details.
     */
    public async emit<T extends Event>(event: T): Promise<EventResult<T>> {
        const startTime = performance.now();
        const eventName = event.constructor.name;
        const handlers = [...(this.listeners.get(eventName) || [])].sort(
            (a, b) => a.priority - b.priority
        );

        let executedHandlers = 0;

        const executionDetails: Array<{
            priority: EventPriority;
            handlerId: string;
            executionTime?: number;
        }> = [];

        for (const { handler, priority, id } of handlers) {
            if (event instanceof CancellableEvent && event.isCancelled()) {
                break;
            }

            const handlerStartTime = performance.now();

            await handler(event);

            executedHandlers++;

            executionDetails.push({
                priority,
                handlerId: id,
                executionTime: performance.now() - handlerStartTime
            });
        }

        return {
            event,
            handlerCount: executedHandlers,
            executionTime: performance.now() - startTime,
            executedHandlers: executionDetails
        };
    }
}
