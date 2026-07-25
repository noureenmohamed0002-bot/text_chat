const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ─── Static file server (serves the public/ folder) ──────────────────────────
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const httpServer = http.createServer((req, res) => {
  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// ─── WebSocket server ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

const clients = new Map();

function broadcast(message, excludeUsername = null) {
  const payload = JSON.stringify(message);
  for (const [username, client] of clients) {
    if (username === excludeUsername) continue;
    if (client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  }
}

function sendTo(username, message) {
  const client = clients.get(username);
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(message));
  }
}

function getUserList() {
  return Array.from(clients.keys());
}

function broadcastUserList() {
  broadcast({ type: "user_list", users: getUserList() });
}

// ─── Connection handler ──────────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  console.log(`[connect] New connection from ${req.socket.remoteAddress}`);

  let username = null;

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      sendTo(username, { type: "error", message: "Invalid JSON." });
      return;
    }

    switch (data.type) {
      case "join": {
        const requestedName = (data.username || "").trim().slice(0, 20);
        if (!requestedName) {
          sendTo(username, { type: "error", message: "Username cannot be empty." });
          return;
        }
        if (clients.has(requestedName)) {
          sendTo(username, { type: "error", message: `Username "${requestedName}" is already taken.` });
          return;
        }

        if (username && clients.has(username) && clients.get(username).ws === ws) {
          clients.delete(username);
          broadcast({ type: "leave", username });
        }

        username = requestedName;
        clients.set(username, { ws, username });
        console.log(`[join]  ${username} joined (${clients.size} users)`);

        sendTo(username, { type: "join_ack", username, users: getUserList() });
        broadcast({ type: "join", username }, username);
        broadcastUserList();
        break;
      }

      case "message": {
        if (!username) {
          sendTo(username, { type: "error", message: "You must join first." });
          return;
        }
        const text = (data.text || "").trim();
        if (!text) return;

        const timestamp = new Date().toISOString();
        console.log(`[msg]   ${username}: ${text}`);

        broadcast({ type: "message", username, text, timestamp }, username);
        break;
      }

      default:
        sendTo(username, { type: "error", message: `Unknown message type "${data.type}".` });
    }
  });

  ws.on("close", () => {
    if (username && clients.has(username) && clients.get(username).ws === ws) {
      clients.delete(username);
      console.log(`[leave] ${username} left (${clients.size} users)`);
      broadcast({ type: "leave", username });
      broadcastUserList();
    }
  });

  ws.on("error", (err) => {
    console.error(`[error] WebSocket error for ${username || "unknown"}:`, err.message);
  });
});

// ─── Start server ────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  let localIP = "127.0.0.1";
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== "127.0.0.1") break;
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║        🔵 LAN Text Chat — Server Running            ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Local:    http://localhost:${PORT}                    ║`);
  console.log(`║  Network:  http://${localIP}:${PORT}                   ║`);
  console.log(`║  WS URL:   ws://${localIP}:${PORT}                     ║`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
});

