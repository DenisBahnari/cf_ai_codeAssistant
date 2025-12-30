const app = document.getElementById("app");
let currentSessionId = null;

async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error("API error");
  return res;
}


// ######### Render Sessions #########

async function renderSessions() {
  const res = await api("/all_sessions");
  const sessions = await res.json();

  app.innerHTML = `
    <div class="sessions">
      <h1>Sessions</h1>
      <button id="newSession">+ New Session</button>
      <div id="list"></div>
    </div>
  `;

  const list = document.getElementById("list");

  sessions.forEach(s => {
    const div = document.createElement("div");
    div.className = "session";

    const name = document.createElement("span");
    name.textContent = s.session_name ?? s.id;
    name.style.cursor = "pointer";
    name.onclick = () => openSession(s.id);

    const del = document.createElement("button");
    del.textContent = "🗑";
    del.className = "secondary";
    del.style.marginLeft = "12px";

    del.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this session?")) return;

      await api("/session", {
        method: "DELETE",
        body: s.id
      });

      renderSessions();
    };

    div.appendChild(name);
    div.appendChild(del);
    list.appendChild(div);
  });


  document.getElementById("newSession").onclick = renderCreateSession;
}

// ######### Render Sessions #########


// ######### Create Sessions #########

function renderCreateSession() {
  app.innerHTML = `
    <div class="sessions">
      <h1>Create session</h1>
      <input id="name" placeholder="Session name" />
      <div style="margin-top:12px">
        <button id="create">Create</button>
        <button class="secondary" id="cancel">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById("cancel").onclick = renderSessions;

  document.getElementById("create").onclick = async () => {
    const name = document.getElementById("name").value.trim();
    if (!name) return;

    const res = await api("/session", {
      method: "POST",
      body: name
    });

    const sessionId = await res.text();
    openSession(sessionId);
  };
}


// ######### Create Sessions #########


// ######### Chat #########

async function openSession(sessionId) {
  currentSessionId = sessionId;

  app.innerHTML = `
    <div id="chat"></div>
    <div id="inputBar">
      <input id="question" placeholder="Hey Rob..." />
      <button id="send">Send</button>
      <button id="micBtn">🎤</button>
      <button id="clear">🧹</button>
      <button id="back">←</button>
    </div>
  `;

  renderMic();

  document.getElementById("back").onclick = renderSessions;
  document.getElementById("send").onclick = sendMessage;
  document.getElementById("clear").onclick = clearHistory;

  await loadMessages(sessionId);
}


async function loadMessages(sessionId) {
  const chat = document.getElementById("chat");

  const res = await api("/all_messages", {
    method: "POST",
    body: sessionId
  });

  const messages = await res.json();

  chat.innerHTML = "";

  messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `msg ${m.role_name === "user" ? "user" : "bot"}`;
    div.textContent =
      `${m.role_name === "user" ? "You" : "Rob"}: ${m.content}`;
    chat.appendChild(div);
  });

  chat.scrollTop = chat.scrollHeight;
}

async function clearHistory() {
  if (!confirm("Clear all messages in this session?")) return;

  await api("/all_messages", {
    method: "DELETE",
    body: currentSessionId
  });

  document.getElementById("chat").innerHTML = "";
}



// ######### Chat #########


// ######### Streaming Message #########

async function sendMessage() {
  const input = document.getElementById("question");
  const chat = document.getElementById("chat");
  const text = input.value.trim();
  if (!text) return;

  chat.innerHTML += `<div class="msg user">You: ${text}</div>`;
  input.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "x-session-id": currentSessionId
    },
    body: text
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let botDiv = document.createElement("div");
  botDiv.className = "msg bot";
  botDiv.textContent = "Rob: ";
  chat.appendChild(botDiv);

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.replace("data:", "").trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload);
        if (json.response) {
          botDiv.textContent += json.response;
          chat.scrollTop = chat.scrollHeight;
        }
      } catch {}
    }
  }
}

// ######### Streaming Message #########


// ####### Speech Detection #######

async function renderMic() {
  const micBtn = document.getElementById("micBtn");

  let listening = false;
  let finalTranscript = "";
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
      micBtn.disabled = true;
      micBtn.textContent = "🎤 not supported";
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += t;
      else interim += t;
    }

    input.value = finalTranscript + interim;
  };

  recognition.onend = () => {
    if (listening) recognition.start();
  };

  recognition.onspeechend = () => {
    recognition.stop();
    listening = false;
    micBtn.textContent = "🎤";

    if (finalTranscript.trim()) {
      sendMessage();
      finalTranscript = "";
    }
  };

  recognition.onerror = () => {
    micBtn.textContent = "🎤";
  };

  micBtn.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      listening = false;
      micBtn.textContent = "🎤";
    } else {
      recognition.start();
      listening = true;
      micBtn.textContent = "🎙️ Listening...";
    }
  });
}
// ####### Speech Detection #######


renderSessions();
