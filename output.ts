import { writeAll } from "https://deno.land/std@0.136.0/streams/mod.ts";

export enum EntryVariant {
  RegularFile = "RegularFile",
  Directory = "Directory",
  Archive = "Archive",
}

type entry = {
  variant: EntryVariant;
  unpackedPath?: string;
  archivePath: string;
  absolutePath: string;
};

export interface logger {
  log(data: string): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export interface output {
  entry(data: entry): void;
  info(data: string): void;
  error(msg: string): void;
  warn(msg: string): void;
}

export class StandardOutput implements logger {
  log(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }

  info(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }

  error(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stderr, text);
  }

  warn(data: string): void {
    const text = new TextEncoder().encode(data);
    writeAll(Deno.stdout, text);
  }
}

export class UnixSocketOutput implements logger {
  private conn?: Deno.Conn;

  async connect(path: string): Promise<{ err?: string }> {
    try {
      this.conn = await Deno.connect({ path, transport: "unix" });
    } catch (err) {
      return { err };
    }

    return {};
  }

  log(data: string): void {
    this.write(data);
  }

  info(data: string): void {
    this.write(data);
  }

  error(msg: string): void {
    this.write(msg);
  }

  warn(msg: string): void {
    this.write(msg);
  }

  private write(data: string) {
    this.conn?.write(new TextEncoder().encode(data));
  }
}

export type textOutputOptions = {
  absolutePaths?: boolean;
  columnSeparator?: string;
  longList?: boolean;
  longVariant?: boolean;
};

const defaultOptions: textOutputOptions = {
  absolutePaths: false,
  columnSeparator: "  ",
  longList: false,
  longVariant: false,
};

export class TextOutput implements output {
  private options: textOutputOptions;

  constructor(
    private logger: logger,
    options?: textOutputOptions,
  ) {
    this.options = Object.assign(
      {},
      defaultOptions,
      options,
    );
  }

  entry(entry: entry): void {
    const entryLine = [];
    if (this.options.longList) {
      entryLine.push(
        this.options.longVariant ? entry.variant : entry.variant[0],
      );
    }

    const entryPath = this.options.absolutePaths
      ? entry.absolutePath
      : entry.archivePath;
    entryLine.push(entryPath);

    const resultText = entryLine.join(this.options.columnSeparator);
    this.logger.log(`${resultText}\n`);
  }

  info(data: string): void {
    this.logger.info(`[INF] ${data}\n`);
  }

  error(msg: string): void {
    this.logger.error(`[ERR] ${msg}\n`);
  }

  warn(msg: string): void {
    this.logger.warn(`[WRN] ${msg}\n`);
  }
}

export class JSONOutput implements output {
  constructor(private logger: logger) {}

  entry(data: entry): void {
    this.logger.log(`${JSON.stringify({ ...data })}\n`);
  }

  info(msg: string): void {
    this.logger.log(`${JSON.stringify({ info: msg })}\n`);
  }

  error(msg: string): void {
    this.logger.error(`${JSON.stringify({ err: msg })}\n`);
  }

  warn(msg: string): void {
    this.logger.warn(`${JSON.stringify({ wrn: msg })}\n`);
  }
}
