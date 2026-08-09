// filecast.ts — LAN file server for ancient browsers. TypeScript edition.
// Zero dependencies: http + fs + os + path only (maximizes scriptc static surface).
// Receivers need NOTHING but a browser: plain HTML listing, no JS, works on iOS 9 Safari.
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as child_process from "node:child_process";
import * as readline from "node:readline";
import * as net from "node:net";

const PORT = parseInt(process.env.PORT || "8000", 10) || 8000;
const SHARE_DIR = path.resolve(process.argv.length > 2 ? process.argv[2] : path.join(process.cwd(), "share"));

// embedded favicon (16+32px .ico; regenerate with make_favicon.py)
const FAVICON_B64 = "AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAMxVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/wAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AACAAQAAz/MAAMADAAD//wAA/n8AAPw/AAD4HwAA8A8AAOAHAAD8PwAA/D8AAPw/AAD8PwAA//8AAP//AAAoAAAAIAAAAEAAAAABACAAAAAAAIAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMxVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzFUR/8xVEf/MVRH/zFUR/8xVEf/MVRH/zFUR/8xVEf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//////////wAAAA8AAAAPw//8P8P//D/AAAA/wAAAP/////////////D////w////wD///8A///8AD///AA///AAD//wAA//wAAD/8AAA///AP///wD///8A////AP///wD///8A////AP///wD///////////////////////";
const FAVICON = Buffer.from(FAVICON_B64, "base64");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".epub": "application/epub+zip",
  ".zip": "application/zip",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtSize(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function lanIPs(): string[] {
  const out: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const i of ifaces[name] || []) {
      if (i.family === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  return out;
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico">
<title>${escapeHtml(title)}</title>
<style>
body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; margin: 0; padding: 0; background: #f7f7f7; -webkit-text-size-adjust: 100%; }
.wrap { max-width: 42em; margin: 0 auto; padding: 0 1em; }
h1 { font-size: 1.25em; padding: .9em 0 .5em; margin: 0; }
ul { list-style: none; padding: 0; margin: 0; }
li { padding: .95em 0; border-bottom: 1px solid #ddd; font-size: 1.1em; line-height: 1.35; }
li:last-child { border-bottom: none; }
a { color: #1155cc; text-decoration: none; }
a:active { color: #cc0000; }
.m { color: #777; font-size: .85em; margin-top: .2em; }
</style>
</head>
<body>
<div class="wrap">
<h1>${escapeHtml(title)}</h1>
${body}
</div>
<script>
(function () {
  // Show file times in the viewer's own local timezone (ES5, ancient-browser safe)
  var els = document.querySelectorAll("span.ts");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var ts = parseInt(el.getAttribute("data-ts"), 10);
    if (isNaN(ts)) continue;
    var d = new Date(ts);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    el.textContent = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
})();
</script>
</body>
</html>`;
}

// epoch ms -> "YYYY-MM-DD HH:MM" UTC, pure integer math (no Date object — scriptc has no Date lowering yet)
function fmtEpoch(ms: number): string {
  let s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  // days since epoch -> civil date (Howard Hinnant's days-from-civil)
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mo = mp < 10 ? mp + 3 : mp - 9;
  const yy = y + (mo <= 2 ? 1 : 0);
  const p = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${yy}-${p(mo)}-${p(d)} ${p(h)}:${p(m)}`;
}

function listPage(dir: string): string {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return page("filecast", "<p>Cannot read directory.</p>");
  }
  entries.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  const rows: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const href = encodeURIComponent(e.name) + (e.isDirectory() ? "/" : "");
    let label = e.name;
    let meta = "";
    if (e.isDirectory()) {
      label += "/";
    } else {
      try {
        const st = fs.statSync(path.join(dir, e.name));
        meta = `<div class="m">${fmtSize(st.size)} · <span class="ts" data-ts="${st.mtimeMs}">${fmtEpoch(st.mtimeMs)}</span></div>`;
      } catch {
        /* ignore */
      }
    }
    rows.push(`<li><a href="${href}">${escapeHtml(label)}</a>${meta}</li>`);
  }
  if (rows.length === 0) rows.push("<li><em>No files. Drop files in the share folder.</em></li>");
  return page("filecast — shared files", "<ul>" + rows.join("") + "</ul>");
}

const server = http.createServer((req, res) => {
  try {
  const raw = (req.url || "/").split("?")[0];
  let url: string;
  try {
    url = decodeURIComponent(raw);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("bad request");
    return;
  }
  if (url === "/fc-probe") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`filecast ${process.pid}`);
    return;
  }
  if (url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "image/x-icon", "Content-Length": FAVICON.length });
    res.end(FAVICON);
    return;
  }
  const rel = url.replace(/^\/+/, "");
  const target = path.resolve(SHARE_DIR, rel);
  if (target !== SHARE_DIR && !target.startsWith(SHARE_DIR + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("forbidden");
    return;
  }
  let st: fs.Stats;
  try {
    st = fs.statSync(target);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 not found");
    return;
  }
  if (st.isDirectory()) {
    const body = listPage(target);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
    return;
  }
  const ext = path.extname(target).toLowerCase();
  const mime = ext in MIME ? MIME[ext] : "application/octet-stream";
  let data: Buffer;
  try {
    data = fs.readFileSync(target);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": data.length,
  });
  res.end(data);
  } catch {
    try {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("server error");
    } catch {
      /* response already sent — nothing to do */
    }
  }
});

const PORT_ATTEMPTS = 20;

function openBrowser(url: string): void {
  if (process.platform !== "win32") return;
  try {
    const opener = child_process.spawn("cmd", ["/c", "start", "", url], { windowsHide: true, stdio: "ignore" });
    opener.on("error", () => { /* browser did not open — banner still guides */ });
  } catch {
    /* ignore */
  }
}

// probe a port: calls back "" if free, raw HTTP response text if something is listening.
// Plain TCP (net) on purpose: no TLS/zlib in the binary — keeps the stack minimal.
function probePort(p: number, cb: (body: string) => void): void {
  const sock = net.createConnection({ host: "127.0.0.1", port: p });
  let data = "";
  let done = false;
  const finish = (body: string) => {
    if (!done) {
      done = true;
      try { sock.destroy(); } catch { /* ignore */ }
      cb(body);
    }
  };
  sock.setTimeout(400);
  sock.on("connect", () => sock.write("GET /fc-probe HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n"));
  sock.on("data", (chunk) => { data += chunk.toString(); });
  sock.on("end", () => finish(data));
  sock.on("close", () => finish(data));
  sock.on("error", () => finish(""));
  sock.on("timeout", () => finish(""));
}

function askUser(question: string, cb: (ans: string) => void): void {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let done = false;
  const finish = (ans: string) => {
    if (!done) {
      done = true;
      rl.close();
      cb(ans);
    }
  };
  rl.question(question, finish);
  setTimeout(() => finish("n"), 30000); // no answer in 30s: never kill anything
}

function killPid(pid: number, cb: () => void): void {
  const win = process.platform === "win32";
  const cmd = win ? "taskkill" : "kill";
  const args = win ? ["/PID", String(pid), "/F"] : ["-9", String(pid)];
  try {
    const k = child_process.spawn(cmd, args, { stdio: "ignore", windowsHide: true });
    k.on("exit", () => setTimeout(cb, 300));
    k.on("error", cb);
  } catch {
    cb();
  }
}

function startServer(port0: number): void {
  let port = port0;
  let waits = 0;
  server.on("error", (err: Error) => {
    const msg = err.message || "";
    if (msg.includes("EADDRINUSE")) {
      // a just-killed server leaves TIME_WAIT sockets that block rebinding for ~2 min
      if (waits < 60 && port <= PORT + PORT_ATTEMPTS) {
        if (waits === 0) process.stdout.write("  Waiting for the network port to free up…\n");
        waits++;
        setTimeout(() => server.listen(port, "0.0.0.0"), 1000);
        return;
      }
      waits = 0;
      port++;
      if (port <= PORT + PORT_ATTEMPTS) {
        server.listen(port, "0.0.0.0");
        return;
      }
    }
    process.stdout.write("\nfilecast could not start.\n");
    process.stdout.write("  Another program is using the network port, or a firewall blocked it.\n");
    process.stdout.write("  Close other programs and try again.\n");
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    fs.mkdirSync(SHARE_DIR, { recursive: true });
    const ips = lanIPs();
    const main = ips.find((ip) => ip.startsWith("192.168.")) || ips[0] || "localhost";
    process.stdout.write("\nfilecast is running.\n");
    process.stdout.write(`  Shared folder : ${SHARE_DIR}\n`);
    process.stdout.write(`  On your phone or tablet, open: http://${main}:${port}\n`);
    for (const ip of ips) {
      if (ip !== main) process.stdout.write(`  Also on       : http://${ip}:${port}\n`);
    }
    process.stdout.write(`  On this PC    : http://localhost:${port}\n`);
    process.stdout.write("  Close this window to stop sharing.\n\n");
    openBrowser(`http://localhost:${port}`);
  });
}

function probeNext(p: number): void {
  if (p > PORT + PORT_ATTEMPTS) {
    process.stdout.write("\nfilecast could not find a free port.\n");
    process.stdout.write("  Close other programs that use the network and try again.\n");
    process.exit(1);
  }
  probePort(p, (body) => {
    if (body === "") {
      startServer(p);
      return;
    }
    if (body.includes("filecast ")) {
      const idx = body.indexOf("filecast ");
      const pid = parseInt(body.substring(idx + 9).trim(), 10);
      process.stdout.write(`\nfilecast is already running on port ${p}.\n`);
      askUser("  Stop it and start a fresh one here? [Y/N]: ", (ans) => {
        if (ans.trim().toLowerCase() === "y") {
          process.stdout.write("  Stopping the old filecast…\n");
          killPid(pid, () => startServer(p));
        } else {
          process.stdout.write("  OK. Opening the running filecast instead.\n");
          openBrowser(`http://localhost:${p}`);
          process.exit(0);
        }
      });
      return;
    }
    // a foreign program owns this port — skip it and try the next
    probeNext(p + 1);
  });
}

probeNext(PORT);
