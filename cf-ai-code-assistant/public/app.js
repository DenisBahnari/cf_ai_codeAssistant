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
      <button id="newSession">New Session</button>
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
        headers: {
          "x-session-id": s.id
        },
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
    <button id="micBtn" class="mic-button">
      <img src="assets/mic_icon.png" alt="Microphone" class="mic-icon" />
    </button>
    <button id="selectFolder">
      <img src="assets/folder_icon.png" alt="Folder" class="folder-icon" />
    </button>
    <button id="clear">Clear Chat</button>
    <button id="back">Back</button>
  </div>
`;

  renderMic();

  document.getElementById("back").onclick = renderSessions;
  document.getElementById("send").onclick = sendMessage;
  document.getElementById("clear").onclick = clearHistory;
  document.getElementById("selectFolder").onclick = pickProjectFolder;

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

  const res = await api("/all_messages", {
    method: "DELETE",
    headers: {
      "x-session-id": currentSessionId
    },
    body: currentSessionId
  });

  document.getElementById("chat").innerHTML = "";
}


async function pickProjectFolder() {
  const handle = await window.showDirectoryPicker();
  await saveHandle(currentSessionId, handle);
  const entries = await buildTree(handle);
  const bodyInfo = {
    "rootName": handle.name,
    "tree": entries,
  }
  console.log(bodyInfo);
  await api("/project_context", {
    method: "POST",
    headers: {
      "x-session-id": currentSessionId
    },
    body: JSON.stringify(bodyInfo)
  });
}

async function buildTree(dirHandle, base = "") {
  const entries = [];

  for await (const [name, handle] of dirHandle.entries()) {
    const path = base ? `${base}/${name}` : name;

    if (handle.kind === "directory") {
      entries.push({ path, type: "dir" });
      entries.push(...await buildTree(handle, path));
    } else {
      entries.push({ path, type: "file" });
    }
  }

  return entries;
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

  if (res.headers.get("content-type")?.includes("application/json")) {
    const data = await res.json();
    console.log(data);
    if (data.decision === "needs_files") {
          renderAskFileAprove(data);
    }
  } else {
    await renderStream(chat, res);
  }

}

async function renderStream(chat, res) {
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

function renderAskFileAprove(data) {
  app.innerHTML = `
    <div class="file_request">
      <h1>Aproval Request: ${ data.reason } Files needed: ${ data.files } </h1>
      <div style="margin-top:12px">
        <button id="aprove_file_button">Aprove</button>
        <button class="secondary" id="cancel_file_button">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById("cancel_file_button").onclick = async () => {
    openSession(currentSessionId);
    const chat = document.getElementById("chat");
    data.result = false;
    const res = await api("/file_request", {
      method: "POST",
      headers: {
        "x-session-id": currentSessionId
      },
      body: JSON.stringify(data)
    });
    await renderStream(chat, res);
  }
 
  document.getElementById("aprove_file_button").onclick = async () => {
    openSession(currentSessionId);
    const chat = document.getElementById("chat");
    let filesData = `
    PROJECT FILE CONTEXT (user-approved):
    `;
    for (let file of data.files) {
      let fileContent = await readFile(file);
      filesData += `
        File: ${file}
        --------------------------------
        ${fileContent}
        --------------------------------  
      `;
    }
    filesData += `
      Rules:
      - This is the real file content
      - Do not assume other files
    `;
    console.log(filesData);
    data.result = true;
    data.filesData = filesData;
    const res = await api("/file_request", {
      method: "POST",
      headers: {
        "x-session-id": currentSessionId
      },
      body: JSON.stringify(data)
    });
    await renderStream(chat, res);
  };
}

async function readFile(filePath) {
  const dirHandle = await loadHandle(currentSessionId);
  if (!dirHandle) {
    throw new Error("No directory selected for this session");
  }

  console.log(dirHandle);
  console.log(filePath);

  const perm = await dirHandle.queryPermission({ mode: "read" });
  if (perm !== "granted") {
    await dirHandle.requestPermission({ mode: "read" });
  }

  const parts = filePath.split("/");
  let current = dirHandle;

  for (const part of parts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part);
  }

  const fileHandle = await current.getFileHandle(parts.at(-1));
  const file = await fileHandle.getFile();
  return await file.text();
}
// ######### Streaming Message #########


// ####### Speech Detection #######
async function renderMic() {
  const micBtn = document.getElementById("micBtn");
  let listening = false;
  let finalTranscript = "";
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // Verificar suporte
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = "Speech recognition not supported in your browser";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = "";
    const input = document.getElementById("question");

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += t;
      } else {
        interim += t;
      }
    }

    // Atualiza o input com o texto reconhecido
    input.value = finalTranscript + interim;
    
    // Rola para o final do texto
    input.scrollLeft = input.scrollWidth;
  };

  recognition.onend = () => {
    // Se ainda estiver escutando, reinicia
    if (listening) {
      setTimeout(() => {
        if (listening) {
          recognition.start();
        }
      }, 100);
    }
  };

  recognition.onspeechend = () => {
    recognition.stop();
    listening = false;
    micBtn.classList.remove("listening");
    
    const input = document.getElementById("question");
    
    // Se tem texto reconhecido, envia a mensagem
    if (finalTranscript.trim()) {
      // Pequeno delay para dar feedback visual
      setTimeout(() => {
        sendMessage();
      }, 300);
    }
    
    finalTranscript = "";
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    listening = false;
    micBtn.classList.remove("listening");
    
    // Feedback visual de erro
    micBtn.style.backgroundColor = "#FF4757";
    setTimeout(() => {
      micBtn.style.backgroundColor = "";
    }, 1000);
  };

  micBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    // Pedir permissão se necessário
    try {
      if (listening) {
        // Parar gravação
        recognition.stop();
        listening = false;
        micBtn.classList.remove("listening");
      } else {
        // Iniciar gravação
        recognition.start();
        listening = true;
        micBtn.classList.add("listening");
        
        // Limpar texto anterior
        finalTranscript = "";
      }
    } catch (error) {
      console.error("Error with speech recognition:", error);
      micBtn.disabled = true;
      micBtn.title = "Microphone access denied";
    }
  });

  micBtn.title = "Click to start voice input";
}
// ####### Speech Detection #######


// ####### FileHandle DB #######

async function saveHandle(sessionId, handle) {
  const db = await openDB();
  const tx = db.transaction("handles", "readwrite");
  tx.objectStore("handles").put(handle, sessionId);
  await tx.done;
}

async function loadHandle(sessionId) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("handles", "readonly");
    const store = tx.objectStore("handles");
    const request = store.get(sessionId);

    request.onsuccess = () => {
      resolve(request.result); 
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("fs-handles", 1);

    req.onupgradeneeded = () => {
      req.result.createObjectStore("handles");
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ####### FileHandle DB #######


renderSessions();
