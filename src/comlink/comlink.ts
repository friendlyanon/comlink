import { explodeUnsafe, fold } from "userjs-util";
import { ComlinkDto } from "./comlink-dto";
import { MessageKey } from "./enums/message-key";
import { StorageKey } from "./enums/storage-key";
import { EventHandler } from "./event-handler";
import { Keepalive, KeepaliveCtor, pingTimeoutMillis } from "./keepalive";
import { MasterManager, MasterManagerCtor } from "./master-manager";
import { MessageHandler, MessageHandlerCtor } from "./message-handler";
import { StorageDao } from "./storage-dao";
import { Tab } from "./tab";

export class ComlinkImpl {
  public stopKeepalive = false;

  public readonly id = ComlinkImpl.generateId();

  public readonly events = new EventHandler();

  public readonly tabs: Map<string, Tab>;

  public readonly masterManager: MasterManager;

  private readonly storage = new StorageDao(window.localStorage);

  private readonly messageHandler: MessageHandler;

  private readonly keepalive: Keepalive;

  constructor(
    mm: MasterManagerCtor,
    mh: MessageHandlerCtor,
    ka: KeepaliveCtor,
  ) {
    this.tabs = new Map(this.storage.get(StorageKey.TABS) ?? []);
    this.masterManager = mm(this);
    this.messageHandler = mh(this, this.masterManager);
    this.keepalive = ka(this);

    this.events.on(MessageKey.PING, this.onPing.bind(this));
    window.addEventListener("storage", this.onStorage.bind(this));
    window.addEventListener("unload", this.onUnload.bind(this));
  }

  private static tabCounter(count: number, [key]: [string, Tab]) {
    return key === StorageKey.MASTER ? count : count + 1;
  }

  private static generateId(): string {
    const date = Date.now();
    const id = String((Math.random() * (-1 >>> 1)) | 0).padStart(10, "0");

    return `${date}${id}`;
  }

  broadcast(event: MessageKey, data?: any, destination?: string): void {
    const id = ComlinkImpl.generateId();
    const origin = this.masterManager.isMaster() ? null : this.id;
    const now = Date.now();
    const dto = new ComlinkDto(id, event, data, destination, origin, now);

    if (destination !== origin) {
      this.storage.set(StorageKey.MESSAGE, `${origin};${dto.toString()}`);
    }

    if (destination == null || destination === origin) {
      this.events.emit(event, dto);
    }
  }

  broadcastToMaster(event: MessageKey, data?: any): void {
    this.broadcast(event, data, this.masterManager.id);
  }

  flushTabs(): void {
    const tabs = [...this.tabs];

    this.storage.set(StorageKey.TABS, JSON.stringify(tabs));
  }

  private onStorage(event: StorageEvent): void {
    if (event.key !== StorageKey.MESSAGE || !event.newValue) {
      return;
    }

    const parts = explodeUnsafe(";", event.newValue, 7);
    if (parts.length !== 7 || parts[0] === this.id) {
      return;
    }

    const message = ComlinkDto.fromParts(parts.slice(1));
    if (message.destination === null || message.destination === this.id) {
      this.events.emit(message.event, message);
    }
  }

  private onUnload(): void {
    this.stopKeepalive = true;

    const slaveTabCount = fold(this.tabs, 0, ComlinkImpl.tabCounter);
    if (slaveTabCount === 1) {
      this.tabs.clear();
      this.flushTabs();
    } else {
      this.broadcast(MessageKey.TAB_CLOSED, this.id);
    }
  }

  private onPing(dto: ComlinkDto): void {
    if (dto.destination !== this.id) {
      return;
    }

    if (Date.now() - dto.timestamp < pingTimeoutMillis) {
      this.broadcast(MessageKey.PONG, void 0, dto.origin ?? void 0);
    }
  }
}

export type ComlinkInterface = InstanceType<typeof ComlinkImpl>;
