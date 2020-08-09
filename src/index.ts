import { Keepalive } from "./comlink/keepalive";
import { MasterManager } from "./comlink/master-manager";
import { MessageHandler } from "./comlink/message-handler";
import { Callback } from "./comlink/callback";
import { ComlinkImpl, ComlinkInterface } from "./comlink/comlink";
import { ComlinkDto as ComlinkDtoClass } from "./comlink/comlink-dto";
import { MessageKey } from "./comlink/enums/message-key";

export interface ComlinkDto<T> extends ComlinkDtoClass<T> {
}

export type Listener<T> = (message: ComlinkDto<T>) => void;

class Comlink {
  private readonly comlink: ComlinkInterface;

  constructor() {
    this.comlink = new ComlinkImpl(
      MasterManager.new,
      MessageHandler.new,
      Keepalive.new,
    );
  }

  /**
   * Returns the current tab's id or null if the current tab is the master.
   */
  get id(): string | null {
    return this.isMaster() ? null : this.comlink.id;
  }

  /**
   * Returns whether this tab is the master tab or not.
   */
  isMaster(): boolean {
    return this.comlink.masterManager.isMaster();
  }

  broadcast(event: string, data?: any, destintion?: string): void {
    this.comlink.broadcast(<MessageKey> event, data, destintion);
  }

  broadcastToMaster(event: string, data?: any): void {
    this.comlink.broadcastToMaster(<MessageKey> event, data);
  }

  on<T>(event: string, listener: Listener<T>): Listener<T> {
    return this.comlink.events.on(event, <Callback> listener);
  }

  once<T>(event: string, listener: Listener<T>): Listener<T> {
    return this.comlink.events.once(event, <Callback> listener);
  }

  off<T>(event: string, listener: Listener<T>): void {
    this.comlink.events.off(event, <Callback> listener);
  }
}

export const comlink = new Comlink();
