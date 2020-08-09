import { StorageKey } from "./enums/storage-key";
import { Tab } from "./tab";

export class StorageDao {
  constructor(private readonly storage: Storage) {
  }

  getRaw(key: string): string | null {
    const value = this.storage.getItem(key);

    return value ?? null;
  }

  get(key: StorageKey.TABS): [string, Tab][] | null;

  get<T>(key: string): T | null {
    const json = this.getRaw(key);

    return json == null ? null : JSON.parse(json);
  }

  set(key: string, data: string) {
    this.storage.setItem(key, data);
  }
}
