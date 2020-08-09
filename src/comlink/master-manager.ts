import { reduce } from "userjs-util";
import { ComlinkInterface } from "./comlink";
import { MessageKey } from "./enums/message-key";
import { StorageKey } from "./enums/storage-key";
import { newTab, Tab } from "./tab";

export class MasterManager {
  constructor(
    private readonly comlink: ComlinkInterface,
  ) {
  }

  get id(): string | undefined {
    return this.get()?.id;
  }

  public static ["new"](
    ...args: ConstructorParameters<typeof MasterManager>
  ): MasterManager {
    return new MasterManager(...args);
  }

  private static idReducer(x: Tab, y: Tab): Tab {
    return x.id < y.id ? x : y;
  }

  election(): void {
    const tabs = this.comlink.tabs.values();
    const id = <string> reduce(tabs, MasterManager.idReducer)?.id;

    if (id === this.comlink.id) {
      this.comlink.broadcast(MessageKey.TAB_PROMOTED, this.comlink.id);
    } else {
      this.set(newTab(id));
    }
  }

  isMaster(): boolean {
    return this.id === this.comlink.id;
  }

  get(): Tab | undefined {
    return this.comlink.tabs.get(StorageKey.MASTER);
  }

  set(tab: Tab): void {
    this.comlink.tabs.set(StorageKey.MASTER, tab);
  }

  delete(): void {
    this.comlink.tabs.delete(StorageKey.MASTER);
  }
}

export type MasterManagerCtor = typeof MasterManager.new;
