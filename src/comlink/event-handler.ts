import { emplace } from "userjs-util";
import { Callback } from "./callback";

export class EventHandler {
  private readonly events = new Map<string, Callback[]>();

  on(event: string, listener: Callback): Callback {
    const eventGroup = emplace(this.events, event, () => []);
    if (!eventGroup.includes(listener)) {
      eventGroup.push(listener);
    }

    return listener;
  }

  once(event: string, listener: Callback): Callback {
    const handler = (...args: any[]) => {
      try {
        listener(...args);
      } finally {
        this.off(event, handler);
      }
    };

    return this.on(event, handler);
  }

  off(event: string, listener: Callback): void {
    const group = this.events.get(event);
    if (group != null) {
      const index = group.indexOf(listener);
      if (index !== -1) {
        group.splice(index, 1);
      }
    }
  }

  removeAll(event: string): void {
    this.events.delete(event);
  }

  emit(event: string, ...eventArgs: any[]): void {
    const group = this.events.get(event) ?? [];
    for (const listener of group) {
      listener(...eventArgs);
    }
  }
}
