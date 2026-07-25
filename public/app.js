// ─── DOM references ────────────────────────────────────────────────────────
const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const loginError = document.getElementById("login-error");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesDiv = document.getElementById("messages");
const userListDiv = document.getElementById("user-list");
const statusSpan = document.getElementById("status");
const chatHeader = document.getElementById("chat-header");

// ─── State ──────────────────────────────────────────────────────────────────
let ws = null;
let username = null;
let connected = false;

// ─── WebSocket connection ───────────────────────────────────────────────────
function connect() {
  // Determine server URL — use the page's host (works for LAN too)
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    connected = true;
    updateStatus("Connected. Joining...", "connected");
    // Send join request
    ws.send(JSON.stringify({ type: "join", username: username }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onclose = () => {
    connected = false;
    updateStatus("Disconnected. Refresh to reconnect.", "disconnected");
    ws = null;
  };

  ws.onerror = () => {
    updateStatus("Connection error.", "error");
  };
}

// ─── Message handler ────────────────────────────────────────────────────────
function handleMessage(data) {
  switch (data.type) {
    case "join_ack": {
      // Server confirmed our join
      loginScreen.classList.add("hidden");
      chatScreen.classList.remove("hidden");
      chatHeader.textContent = `LAN Chat — ${data.username}`;
      updateStatus("Connected", "connected");
      renderUserList(data.users || []);
      break;
    }

    case "join": {
      appendSystemMessage(`${data.username} joined the chat.`);
      break;
    }

    case "leave": {
      appendSystemMessage(`${data.username} left the chat.`);
      break;
    }

    case "message": {
      appendChatMessage(data.username, data.text, data.timestamp);
      break;
    }

    case "user_list": {
      renderUserList(data.users || []);
      break;
    }

    case "error": {
      if (!connected) {
        loginError.textContent = data.message;
        loginError.classList.remove("hidden");
      } else {
        appendSystemMessage(`Error: ${data.message}`);
      }
      break;
    }

    default:
      console.warn("Unknown message type:", data.type);
  }
}

// ─── UI helpers ─────────────────────────────────────────────────────────────
function updateStatus(text, className) {
  statusSpan.textContent = text;
  statusSpan.className = className;
}

function renderUserList(users) {
  userListDiv.innerHTML = users
    .map((u) => `<div class="user-item">${u}${u === username ? " (you)" : ""}</div>`)
    .join("");
}

function appendSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "message system";
  div.textContent = text;
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function appendChatMessage(sender, text, timestamp) {
  const div = document.createElement("div");
  div.className = `message ${sender === username ? "own" : "other"}`;

  const header = document.createElement("div");
  header.className = "message-header";
  header.innerHTML = `<strong>${sender}</strong> <span class="time">${formatTime(timestamp)}</span>`;

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = text;

  div.appendChild(header);
  div.appendChild(body);
  messagesDiv.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Event listeners ────────────────────────────────────────────────────────
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = usernameInput.value.trim();
  if (!val) return;
  username = val;
  loginError.classList.add("hidden");
  connect();
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !ws || !connected) return;
  ws.send(JSON.stringify({ type: "message", text }));
  messageInput.value = "";
  messageInput.focus();
});

// Allow sending message with Enter (already handled by form submit)

