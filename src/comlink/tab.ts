export interface Tab {
  id: string;
  lastUpdated: number;
}

export const newTab = (id: string, lastUpdated: number = Date.now()): Tab =>
  ({ id, lastUpdated });
