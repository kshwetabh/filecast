# filecast

Share files from your computer with any phone, tablet, or old device — just open a URL in its browser. No app to install on the receiving device.

Works with browsers that modern tools have abandoned: iOS 9 Safari, old Android WebKit, anything that can render plain HTML.

> ⚠️ **No security.** filecast implements no authentication, no encryption, and no access control. Any file placed in the shared directory is served over the network to anyone who can reach the host. Only run it when you intend to share, and stop it when done.

## Who is this for?

Non-technical users who just want a quick and simple way to share files with another device on the same network. No accounts, no cloud, no configuration, no reading manuals: drop files in a folder, double-click the app, open the URL it shows on the other device. It is deliberately minimal — one file, one folder, one URL.

## Download

Get the latest Windows build here: **[Download filecast.exe](https://github.com/kshwetabh/filecast/releases/tag/continuous)**

A SHA-256 checksum file is attached alongside the binary so you can verify it. See the [releases page](https://github.com/kshwetabh/filecast/releases) for all builds.

## Features

- **Zero install on the receiving device** — open a URL, that's it
- **Zero runtime on the PC** — one ~900 KB native executable, no Node, no Python, no dependencies
- **LAN-only** — no internet, no cloud, no accounts, no file-size limits
- **Ancient-browser safe** — the file list is plain HTML; an optional 10-line ES5 script renders timestamps in the viewer's own timezone (plain fallback without JavaScript)
- **Mobile-optimized, touch-friendly** listing, sorted by filename, showing size and last-modified time
- **Single-instance aware** — launching again asks before stopping the running instance; never kills anything without your say-so, and never touches other programs using the same port

## Use

1. Drop files into the `share` folder next to `filecast.exe`
2. Double-click `filecast.exe` — your browser opens the control panel
3. Open the URL shown on your phone or tablet (same Wi-Fi)
4. Tap files to open them; close the window to stop sharing

Notes:

- If the app is already running, launching it again asks whether to stop the old instance (30 s no-answer default: never kill).
- If port 8000 is busy, the app automatically uses the next free port and shows the correct URL.
- First run: allow the app through Windows Firewall so your devices can reach the PC.

### Windows "Unknown Publisher" warning

The first time you run a downloaded `filecast.exe`, Windows may show a warning that the publisher is unknown. This is expected — the app is not code-signed (signing certificates are paid), and Windows distrusts downloaded executables by default. It is safe to run:

- **Option A:** click **More info** → **Run anyway**, or
- **Option B:** right-click `filecast.exe` → **Properties** → tick **Unblock** → **OK**. This removes the downloaded-file flag so future launches won't ask again.

Every release is built by GitHub Actions directly from this repository's source, and a SHA-256 checksum file is attached to each release so you can verify the binary matches.

## What opens on old devices

- PDFs, images, audio, video, and text open directly in the device browser
- Long-press an image to save it to the device
- Very old Safari (iOS 9 and earlier) has no download manager, so other file types cannot be downloaded from a browser

## Build from source

Requirements: Node.js 18+ (runs the [scriptc](https://github.com/vercel-labs/scriptc) compiler) and [zig](https://ziglang.org/download/) as the compiler driver.

1. `npm install`
2. Download zig for Windows from ziglang.org/download and extract it **into this folder** (any version — the build scripts pick up any `zig-*` directory). The zig binary must be on the build path; that is what the scripts do for you.
3. Build:
   - **Windows:** double-click `build.bat`
   - **or manually:**

   ```bash
   export PATH="$PWD/zig-x86_64-windows-0.16.0:$PATH"   # adjust to the version you downloaded
   export SCRIPTC_CC=zigcc
   ./node_modules/.bin/scriptc build filecast.ts -o filecast.exe
   ```

The whole toolchain stays inside this folder — nothing is installed system-wide.

Note: scriptc is Vercel Labs' experimental TypeScript-to-native compiler. It is a build-time tool only; the shipped executable is standalone.

## Project layout

```
filecast.ts        single-file source (Node stdlib: http, fs, net, readline, child_process, os, path)
filecast.exe       compiled binary (includes embedded favicon)
build.bat          one-click rebuild (Windows)
share/             drop files here — served as-is
node_modules/      scriptc compiler (local install)
zig-*/             portable zig toolchain
```

## How it works

- Every page request re-reads the folder, so new files appear after a refresh — no restart needed
- The list is sorted case-insensitively by filename; size + last-modified shown per file
- On startup the app probes ports 8000–8020 for an existing filecast instance (`/fc-probe`) and asks before replacing it; ports owned by other programs are skipped
- Path traversal attempts are rejected (403)
- Port: 8000 by default; override with the `PORT` environment variable

## Security

⚠️ **This project does not implement any security features.**

- No authentication, no password, no encryption, no access control.
- Any file placed in the shared directory is shared across the network without any protection — anyone who can reach the host (e.g. anyone on the same Wi-Fi) can list and download it while the app is running.
- Do not place sensitive or personal files in the shared directory.
- Stop sharing by closing the window.

## Platform support

- **Host:** Windows (primary). macOS/Linux buildable via zig cross-compilation.
- **Receiver:** any device with a browser — including iOS 9 and Android 4-era browsers.
