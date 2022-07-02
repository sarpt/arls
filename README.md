# arls - list archive contents recursively

Crude and quick implementation of a tool to extract and list contents of archives.

### execution example

Run...

`deno run --unstable --allow-ffi --allow-env --allow-read --allow-write main.ts </path/to/dir or /path/to/archive>`

... or install/compile:

- `deno install --unstable --allow-ffi --allow-env --allow-read --allow-write main.ts`

- `deno compile --unstable --allow-ffi --allow-env --allow-read --allow-write main.ts`

and then run

`arls </path/to/dir or /path/to/archive>`

### docker

Provided Dockerfile compiles `arls` binary using debian variant of deno docker
image and prepares a debian environment with all necessary dependencies met.
It's the preferred way of running this tool since it has all dependencies and
library paths provided/ensured during image build process.

Example usage (ran from the directory where `Dockerfile` is):

- `docker build . -t arls:latest`
- `docker run -it --rm -v /path/to/directory/with/archives/on/local/machine:/mnt arls:latest /mnt/filename`

When running the docker image `libmagic` and `libarchive` arguments are
provided/hardcoded in the Dockerfile and there's no need to provide them again.

### dependencies for running

- `deno` - tested on 1.17.1 and up
- `libmagic` - for files format deduction
- `libarchive` - for archives handling

### permissions

- `unstable` & `allow-ffi` - for FFI (format deduction using `libmagic`, archive
  extraction using `libarchive`)
- `allow-env` - for reading home and tmp directory path
- `allow-read` - for reading directories and files
- `allow-write` - for archives extraction with `libarchive` to descend into
  archives recursively

### arguments

- `-e, --e` : (list) regex pattern for `grep` and its variants. It's mandatory
  to provide at least one.
- `-i, --i` : input file. Mandatory, unless unnamed arguments before `--`
  provided. Ignored when unnamed arguments before `--` provided.
- `--json` : json output. `false` by default.
- `--libarchive`: path to libarchive library. When not provided,
  `/usr/lib/libarchive.so` is used by default.
- `--libmagic`: path to libmagic library. When not provided,
  `/usr/lib/libmagic.so` is used by default.
- `--unix-socket-path`: path to a unix socket on which argrep should send
  results. It's expected that socket is being listened on already before
  execution. When not provided, standard output is used by default.
- `-v` : verbose logging. `false` by default.

### unnamed arguments

- before `--` - arguments (multiple) are treated as root path to
  directory/archive to be checked recursively.
