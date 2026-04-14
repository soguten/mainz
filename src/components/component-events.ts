import {
    getManagedDOMEvents,
    type ManagedDOMEventDescriptor,
    setManagedDOMEvents,
} from "../jsx/dom-factory.ts";
import { isNodeLike } from "./component-dom.ts";

export interface TrackedEventListener {
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options: boolean;
}

export function syncManagedDOMEvents(args: {
    current: Element;
    next: Element;
    registerEvent: (
        target: EventTarget,
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean,
    ) => void;
    unregisterSpecificEvent: (
        target: EventTarget,
        event: ManagedDOMEventDescriptor,
    ) => void;
}): void {
    const currentEvents = getManagedDOMEvents(args.current);
    const nextEvents = getManagedDOMEvents(args.next);

    for (const event of currentEvents) {
        args.unregisterSpecificEvent(args.current, event);
    }

    for (const event of nextEvents) {
        args.unregisterSpecificEvent(args.next, event);
        args.registerEvent(args.current, event.type, event.listener, event.options);
    }

    setManagedDOMEvents(args.current, nextEvents);
    setManagedDOMEvents(args.next, []);
}

export function unregisterSpecificEvent(args: {
    target: EventTarget;
    event: ManagedDOMEventDescriptor;
    eventListeners: TrackedEventListener[];
}): TrackedEventListener[] {
    const normalizedOptions = args.event.options === true;
    args.target.removeEventListener(
        args.event.type,
        args.event.listener,
        normalizedOptions,
    );

    return args.eventListeners.filter((entry) => {
        return !(
            entry.target === args.target &&
            entry.type === args.event.type &&
            entry.listener === args.event.listener &&
            entry.options === normalizedOptions
        );
    });
}

export function unregisterEventsByTargetAndType(args: {
    target: EventTarget;
    type: string;
    options: boolean;
    eventListeners: TrackedEventListener[];
}): TrackedEventListener[] {
    const staleEntries = args.eventListeners.filter((entry) => {
        return entry.target === args.target && entry.type === args.type &&
            entry.options === args.options;
    });

    for (const staleEntry of staleEntries) {
        staleEntry.target.removeEventListener(
            staleEntry.type,
            staleEntry.listener,
            staleEntry.options,
        );
    }

    return args.eventListeners.filter((entry) => {
        return !(entry.target === args.target && entry.type === args.type &&
            entry.options === args.options);
    });
}

export function pruneDetachedEventListeners(args: {
    host: HTMLElement;
    ownerDocument: Document;
    eventListeners: TrackedEventListener[];
}): TrackedEventListener[] {
    const stillTracked: TrackedEventListener[] = [];

    for (const entry of args.eventListeners) {
        const { target } = entry;

        if (!isNodeLike(target, args.ownerDocument)) {
            stillTracked.push(entry);
            continue;
        }

        if (target === args.host || args.host.contains(target)) {
            stillTracked.push(entry);
            continue;
        }

        target.removeEventListener(entry.type, entry.listener, entry.options);
    }

    return stillTracked;
}
