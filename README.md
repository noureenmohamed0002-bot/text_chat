# 🔵 LAN Text Chat

A real-time multi-user text chat application that runs over a local network (LAN). Built with **Node.js**, **WebSockets**, and a clean web-based UI. No database or sign-up required — just join with a username and start chatting.

---

## ✨ Features

- **Real-time messaging** — Messages appear instantly on all connected clients via WebSocket
- **Multi-user support** — Any number of users can join the same chat room
- **Live user list** — See who's online in the sidebar
- **Join/leave notifications** — System messages when users connect or disconnect
- **LAN-ready** — Works seamlessly across devices on the same local network
- **No installation on clients** — Just open the browser and go

---

## 📁 Project Structure

```
text_chat/
├── server.js          # WebSocket + HTTP server (message routing, client mgmt)
├── package.json       # Project manifest & dependencies
├── public/
│   ├── index.html     # Chat UI (login, messages, input)
│   ├── style.css      # Dark-themed styling
│   └── app.js         # Client-side WebSocket logic
├── README.md          # This file
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or later (includes `npm`)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/lan-text-chat.git
cd lan-text-chat

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

You'll see output like:

```
╔══════════════════════════════════════════════════════╗
║        🔵 LAN Text Chat — Server Running            ║
╠══════════════════════════════════════════════════════╣
║  Local:    http://localhost:3000                    ║
║  Network:  http://192.168.1.42:3000                 ║
║  WS URL:   ws://192.168.1.42:3000                   ║
╚══════════════════════════════════════════════════════╝
```

### Connect from the same machine

Open **http://localhost:3000** in your browser.

### Connect from another device on the LAN

1. Find the server machine's local IP address (shown in the server output — e.g., `192.168.1.42`)
2. On any other device on the same network, open **http://192.168.1.42:3000** in a browser
3. Enter a username and start chatting!

> ⚠️ **Important:** All devices must be on the same local network. The default port is `3000`. If your firewall blocks it, you may need to allow incoming connections on port 3000.

---

## 🔧 Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT`              | `3000`  | The port the server listens on |

Example with a custom port:

```bash
PORT=8080 npm start
```

---

## 🧠 How It Works

### Architecture

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────┐
│  Client A    │◄─────►│  Node.js WebSocket   │◄─────►│  Client B    │
│  (Browser)   │       │  Server (Hub/Router) │       │  (Browser)   │
└──────────────┘       └──────────────────────┘       └──────────────┘
                               │
                        ┌──────┴──────┐
                        │  Client C   │
                        │  (Browser)  │
                        └─────────────┘
```

The server acts as a central hub. All clients connect to it, and the server routes messages between them.

### Network Sockets

- The Node.js `http` module creates an HTTP server that serves the static frontend files (HTML, CSS, JS)
- The `ws` (WebSocket) library attaches a WebSocket server to the same HTTP server
- When a client opens the page in a browser, it establishes a **persistent, bidirectional WebSocket connection** to the server
- Unlike HTTP request-response, WebSocket keeps the connection open, enabling instant message delivery

### Message Routing Protocol

All communication uses JSON-formatted messages. Here's how the protocol works:

#### Client → Server

| Type | Fields | Description |
|------|--------|-------------|
| `join` | `{ username }` | Client wants to join the chat |
| `message` | `{ text }` | Client sends a chat message |

#### Server → Client(s)

| Type | Fields | Description |
|------|--------|-------------|
| `join_ack` | `{ username, users: [...] }` | Confirms join, sends current user list |
| `join` | `{ username }` | Broadcast: a new user joined |
| `leave` | `{ username }` | Broadcast: a user disconnected |
| `message` | `{ username, text, timestamp }` | Broadcast: a chat message |
| `user_list` | `{ users: [...] }` | Broadcast: updated list of online users |
| `error` | `{ message }` | Error notification |

#### Routing Logic (in `server.js`)

1. **Join**: When a client sends `join`, the server validates the username (non-empty, unique, ≤20 chars), stores the WebSocket connection in a `Map<username, {ws, username}>`, sends `join_ack` back to the new user, and broadcasts `join` + updated `user_list` to everyone else.

2. **Message**: When a client sends `message`, the server adds a timestamp and **broadcasts** it to all *other* clients (not back to the sender, since the sender already sees it optimistically). This is done via the `broadcast()` function which iterates over the client map and sends to all except an optional `excludeUsername`.

3. **Leave**: When a WebSocket `close` event fires, the server removes the client from the map and broadcasts `leave` + updated `user_list`.

4. **Error handling**: Invalid JSON, empty usernames, duplicate usernames, and unknown message types all return appropriate error messages.

### Why Broadcast Instead of Unicast?

Since this is a shared chat room (not private messaging), every message goes to all participants. The `excludeUsername` parameter ensures the sender doesn't receive their own message twice. The architecture could easily be extended for private messaging by using `sendTo()` instead of `broadcast()`.

---

## 🛡️ Security Notes

- This application has **no authentication** — anyone on the network can join
- **No encryption** — WebSocket connections are plain `ws://`, not `wss://`
- **Intended for trusted LAN environments only** — do not expose to the public internet without adding encryption (e.g., behind a reverse proxy with TLS) and authentication

---

## 🧪 Testing

1. Start the server: `npm start`
2. Open `http://localhost:3000` in **two different browser tabs/windows**
3. Enter different usernames in each tab
4. Send messages — they should appear in the other tab in real time
5. Open a third tab from another device on the same network to test LAN functionality

---

## 📦 Dependencies

- [ws](https://github.com/websockets/ws) — Simple to use, blazing fast and thoroughly tested WebSocket client and server for Node.js

---

## 📄 License

MIT

