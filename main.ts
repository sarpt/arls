import { Args, parse } from "https://deno.land/std@0.120.0/flags/mod.ts";
import { LibArchive } from "https://raw.githubusercontent.com/sarpt/deno-libarchive/master/mod.ts";
import { basename, dirname, join } from "https://deno.land/std@0.125.0/path/mod.ts";

import { forceArrayArgument } from "./utils.ts";
import { defaultLibmagicPath, LibMagic } from "./libmagic.ts";
import {
EntryVariant,
  JSONOutput,
  logger,
  output,
  StandardOutput,
  TextOutput,
  UnixSocketOutput,
} from "./output.ts";

type Arguments = {
  ["--"]: string[]; // arguments to grep after --
  i?: string | string[]; // -i, --i : input file
  json?: boolean; // --json : json output
  v?: boolean; // -v : verbose logging
  td?: string; // --td : temporary directory for archives extraction
  libmagic?: string; // --libmagic : path to libmagic library
  libarchive?: string; // --libarchive : path to libarchive library
  ["unix-socket-path"]?: string; // --unix-socket-path: path to a unix socket file
} & Args;

const tempDirPrefix = "argrep_";

const args = parse(Deno.args, { "--": true }) as unknown as Arguments;

let outLogger: logger;
const unixSocketPath = args["unix-socket-path"];
if (unixSocketPath) {
  const unixSocketOut = new UnixSocketOutput();
  const { err: connectionError } = await unixSocketOut.connect(unixSocketPath);
  if (connectionError) {
    console.error(
      `'Could not estabilish connection to unix socket at '${unixSocketPath}': ${connectionError}`,
    );
    Deno.exit(1);
  }

  outLogger = unixSocketOut;
} else {
  outLogger = new StandardOutput();
}

const out: output = args.json
  ? new JSONOutput(outLogger)
  : new TextOutput(outLogger);

const providedRootPaths: string[] = args._.length > 0
  ? args._.map((arg) => `${arg}`)
  : forceArrayArgument(args.i);

const verbose = args.v;

const libArchive = new LibArchive({ libpath: args.libarchive });
if (verbose) {
  out.info(
    `using '${libArchive.libpath}' as libarchive path`,
  );
}

const libMagicPath = args.libmagic ? args.libmagic : defaultLibmagicPath;
if (verbose) {
  out.info(
    `using '${libMagicPath}' as libmagic path`,
  );
}
const libMagic = new LibMagic();
const { errMsg: libMagicErr } = libMagic.open(libMagicPath);
if (libMagicErr) {
  out.error(
    `could not open libmagic for format deduction: ${libMagicErr}`,
  );
  Deno.exit(1);
}

const tempDir = args.td
  ? args.td
  : await Deno.makeTempDir({ prefix: tempDirPrefix });
if (verbose) {
  out.info(
    `using '${tempDir}' as temporary path for archive extraction`,
  );
}

const keepUnpackedFiles = false;

for (const rootPath of providedRootPaths) {
  try {
    await Deno.stat(rootPath);
  } catch (err) {
    out.error(
      `couldn't stat root path '${rootPath}' - could not read the contents: ${err}`,
    );
    continue;
  }

  const outPath = join(tempDir, basename(rootPath));
  for await (
    const entry of libArchive.walk(rootPath, outPath, keepUnpackedFiles)
  ) {
    if (entry.errMsg) {
      out.error(
        `error while walking through the "${rootPath}" file: ${entry.errMsg}`,
      );
      continue;
    }

    out.entry({
      variant: entry.isArchive ? EntryVariant.Archive : entry.isDirectory ? EntryVariant.Directory : EntryVariant.RegularFile,
      archivePath: entry.extractedPath.replace(tempDir, dirname(rootPath)),
      fullPath: join(rootPath, entry.archivePath)
    });
  }
}

if (!keepUnpackedFiles) {
  try {
    Deno.remove(tempDir, { recursive: true });
  } catch (_err) {
    out.error(`could not delete temporary dir ${tempDir}`);
  }
}

libMagic.close();
