import { delay, filter } from "userjs-util";
import { ComlinkInterface } from "./comlink";
import { MessageKey } from "./enums/message-key";
import { StorageKey } from "./enums/storage-key";
import { newTab, Tab } from "./tab";

const setupEvent = "setupComplete";
const iterations = 5;
const tabKeepaliveMillis = 3000;
const tabTimeoutMillis = 5000;

export const pingTimeoutMillis = 500;

export class Keepalive {
  private now = 0;

  private needSetup = true;

  private intervalHandle: number | undefined;

  constructor(private readonly comlink: ComlinkInterface) {
    this.intervalHandle
      = setInterval(Keepalive.loopDelegate, tabKeepaliveMillis, this);
    this.loop();
    comlink.events.once(setupEvent, () => {
      this.needSetup = false;
    });
  }

  public static ["new"](
    ...args: ConstructorParameters<typeof Keepalive>
  ): Keepalive {
    return new Keepalive(...args);
  }

  private static loopDelegate(instance: Keepalive): void {
    if (!instance.comlink.stopKeepalive) {
      instance.loop();
    }
  }

  private loop(): void {
    this.now = Date.now();
    this.comlink
      .broadcast(MessageKey.TAB_UPDATED, newTab(this.comlink.id, this.now));

    const deadTabEntries
      = filter(this.comlink.tabs.entries(), this.isDead, this);
    for (const { 1: tab } of deadTabEntries) {
      this.comlink.broadcast(MessageKey.TAB_CLOSED, tab.id);
    }

    if (this.needSetup) {
      this.setup();
    }
  }

  private setup(): void {
    const master = this.comlink.masterManager.get();
    if (master == null) {
      return;
    }

    const { events } = this.comlink;
    if (master.id === this.comlink.id) {
      events.emit(setupEvent);
      return;
    }

    events.once(MessageKey.PONG, () => {
      if (this.needSetup) {
        events.emit(setupEvent);
      }
    });

    delay(pingTimeoutMillis - 5 * iterations, Date.now())
      .then(this.forceComplete.bind(this));
    this.comlink.broadcastToMaster(MessageKey.PING);
  }

  private isAlive(tab: Tab): boolean {
    return this.now - tab.lastUpdated < tabTimeoutMillis;
  }

  private isDead([key, tab]: [string, Tab]): boolean {
    return key !== StorageKey.MASTER && !this.isAlive(tab);
  }

  private async forceComplete(start: number): Promise<void> {
    for (let i = 0; ; ++i) {
      if (!this.needSetup) {
        return;
      }

      if (i >= iterations && Date.now() - start > pingTimeoutMillis) {
        break;
      } else {
        await delay(5);
      }
    }

    this.comlink.events.emit(setupEvent);
  }
}

export type KeepaliveCtor = typeof Keepalive.new;
