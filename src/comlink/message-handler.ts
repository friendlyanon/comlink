import { ComlinkInterface } from "./comlink";
import { ComlinkDto } from "./comlink-dto";
import { MessageKey } from "./enums/message-key";
import { MasterManager } from "./master-manager";
import { newTab, Tab } from "./tab";

export class MessageHandler {
  private timeoutHandle: number | undefined;

  constructor(
    private readonly comlink: ComlinkInterface,
    private readonly masterManager: MasterManager,
  ) {
    const { events } = comlink;
    events.on(MessageKey.TAB_CLOSED, this.onTabClosed.bind(this));
    events.on(MessageKey.TAB_UPDATED, this.onTabUpdated.bind(this));
    events.on(MessageKey.TAB_PROMOTED, this.onTabPromoted.bind(this));
  }

  public static ["new"](
    ...args: ConstructorParameters<typeof MessageHandler>
  ): MessageHandler {
    return new MessageHandler(...args);
  }

  private static bullyTabs(instance: MessageHandler): void {
    instance.timeoutHandle = void 0;
    instance.comlink.broadcast(MessageKey.TAB_PROMOTED, instance.comlink.id);
  }

  private onTabClosed({ data: id }: ComlinkDto<string>): void {
    this.comlink.tabs.delete(id);

    const master = this.masterManager.get();
    if (master == null || master.id === id) {
      this.masterManager.delete();
      this.masterManager.election();
    } else if (master.id === this.comlink.id) {
      this.comlink.flushTabs();
    }
  }

  private onTabUpdated({ data: tab }: ComlinkDto<Tab>): void {
    const { id } = tab;
    this.comlink.tabs.set(id, tab);

    const { masterManager } = this;
    if (masterManager.get() == null) {
      masterManager.election();
    }

    if (masterManager.id === id) {
      masterManager.set(tab);
      this.comlink.tabs.delete(id);
    }

    if (masterManager.isMaster()) {
      this.comlink.flushTabs();
    }
  }

  private onTabPromoted({ data: id }: ComlinkDto<string>): void {
    if (this.comlink.id < id) {
      if (this.timeoutHandle != null) {
        return;
      }

      this.timeoutHandle = setTimeout(MessageHandler.bullyTabs, 0, this);
    }

    const previousId = this.masterManager.id;
    this.comlink.tabs.delete(id);
    this.masterManager.set(newTab(id));

    const isMaster = this.masterManager.isMaster();
    if (isMaster) {
      this.comlink.flushTabs();
    }

    if (isMaster && previousId !== this.comlink.id) {
      this.comlink.events.emit(MessageKey.BECOME_MASTER);
    } else if (!isMaster && previousId === this.comlink.id) {
      this.comlink.events.emit(MessageKey.DEMOTE_FROM_MASTER);
    }
  }
}

export type MessageHandlerCtor = typeof MessageHandler.new;
