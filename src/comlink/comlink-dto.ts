export class ComlinkDto<T = unknown> {
  constructor(
    public id: string,
    public event: string,
    public data: Exclude<T, undefined>,
    public destination: string | null = null,
    public origin: string | null,
    public timestamp: number,
  ) {
  }

  static fromParts(args: string[]): ComlinkDto {
    const [id, event, origin, timestamp, destination, data] = args;
    return new ComlinkDto(
      id,
      event,
      data === "null" ? null : JSON.parse(data),
      destination === "null" ? null : destination,
      origin === "null" ? null : origin,
      Number(timestamp),
    );
  }

  toString() {
    const { id, event, origin, timestamp, destination, data } = this;
    return `${id};${event};${origin ?? "null"};${timestamp};${
      destination ?? "null"
    };${data == null ? "null" : JSON.stringify(data)}`;
  }
}
