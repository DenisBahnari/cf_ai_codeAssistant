const app = document.getElementById("app");
let currentSessionId = null;
let currentAgentName = "Rob";

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
    
    <!-- Modal de confirmação (inicialmente escondido) -->
    <div id="deleteModal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <h3>Delete Session</h3>
        <p id="modalMessage">Are you sure you want to delete this session?</p>
        <div class="modal-buttons">
          <button id="modalCancel" class="modal-btn modal-cancel">Cancel</button>
          <button id="modalConfirm" class="modal-btn modal-confirm">Delete</button>
        </div>
      </div>
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
      showDeleteModal(s.id, s.session_name ?? s.id);
    };

    div.appendChild(name);
    div.appendChild(del);
    list.appendChild(div);
  });

  document.getElementById("newSession").onclick = renderCreateSession;
  
  setupModalEvents();
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


let pendingDeleteSessionId = null;

function showDeleteModal(sessionId, sessionName) {
  pendingDeleteSessionId = sessionId;
  
  const modal = document.getElementById("deleteModal");
  const message = document.getElementById("modalMessage");
  
  message.textContent = `Are you sure you want to delete session "${sessionName}"?`;
  modal.style.display = "flex";
}

function hideDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.style.display = "none";
  pendingDeleteSessionId = null;
}

async function confirmDelete() {
  if (!pendingDeleteSessionId) return;
  
  try {
    await api("/session", {
      method: "DELETE",
      headers: {
        "x-session-id": pendingDeleteSessionId
      },
      body: pendingDeleteSessionId
    });
    
    hideDeleteModal();
    renderSessions();
  } catch (error) {
    console.error("Failed to delete session:", error);
    hideDeleteModal();
    alert("Failed to delete session. Please try again.");
  }
}

function setupModalEvents() {
  const modal = document.getElementById("deleteModal");
  const cancelBtn = document.getElementById("modalCancel");
  const confirmBtn = document.getElementById("modalConfirm");
  
  if (!modal || !cancelBtn || !confirmBtn) return;
  
  cancelBtn.onclick = hideDeleteModal;
  
  confirmBtn.onclick = confirmDelete;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      hideDeleteModal();
    }
  };
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideDeleteModal();
    }
  });
}


// ######### Create Sessions #########


// ######### Chat #########

async function openSession(sessionId) {
  currentSessionId = sessionId;

  app.innerHTML = `
    <div class="chat-layout">
      <!-- Sidebar estática com informações -->
      <div class="agent-sidebar">
        <div class="sidebar-section">
          <h3 class="sidebar-title">Session Info</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Session:</span>
              <span id="sessionName" class="info-value">Loading...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Assistant:</span>
              <span id="assistantName" class="info-value">Loading...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Language:</span>
              <span id="assistantLanguage" class="info-value">Loading...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Project:</span>
              <span id="projectRoot" class="info-value">No project</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="project-header">
            <h3 class="sidebar-title">Project Files</h3>
            <span id="fileCount" class="file-count">0 files</span>
          </div>
          <div id="projectTree" class="file-tree">
            <div class="tree-placeholder">No project selected</div>
          </div>
        </div>
      </div>

      <!-- Área do chat -->
      <div class="chat-area">
        <div id="chat" class="chat-messages"></div>
        <div id="inputBar" class="input-bar">
          <input id="question" placeholder="Hey Rob..." />
          <button id="send">Send</button>
          <button id="micBtn" class="mic-button">
            <img src="assets/mic_icon.png" alt="Microphone" class="mic-icon" />
          </button>
          <button id="selectFolder">
            <img src="assets/folder_icon.png" alt="Folder" class="folder-icon" />
          </button>
          <button id="clear">Clear</button>
          <button id="back">Back</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmação (inicialmente escondido) -->
    <div id="clearHistoryModal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <div class="modal-icon">
        </div>
        <h3>Clear Chat History</h3>
        <p id="clearHistoryMessage">Are you sure you want to clear all messages in this session?</p>
        <div class="modal-buttons">
          <button id="clearModalCancel" class="modal-btn modal-cancel">Cancel</button>
          <button id="clearModalConfirm" class="modal-btn modal-confirm">Clear All</button>
        </div>
      </div>
    </div>
  `;

  renderMic();

  document.getElementById("back").onclick = renderSessions;
  document.getElementById("send").onclick = sendMessage;
  document.getElementById("clear").onclick = showClearHistoryModal; 
  document.getElementById("selectFolder").onclick = pickProjectFolder;

  setupClearHistoryModal();

  await Promise.all([
    loadMessages(sessionId),
    loadAgentStatus(sessionId)
  ]);
}

async function loadAgentStatus(sessionId) {
  try {
    const res = await api("/agent_status", {
      method: "GET",
      headers: {
        "x-session-id": sessionId
      }
    });
    
    const agentData = await res.json();
    
    document.getElementById("sessionName").textContent = agentData.sessionName || "Unnamed";
    document.getElementById("assistantName").textContent = agentData.assistantName || "Rob";
    document.getElementById("assistantLanguage").textContent = agentData.languages || "Auto";

    currentAgentName = agentData.assistantName || "Rob";
    
    if (agentData.projetoContext && agentData.projetoContext.rootName) {
      document.getElementById("projectRoot").textContent = agentData.projetoContext.rootName;
      renderFileTree(agentData.projetoContext.tree);
    } else {
      document.getElementById("projectRoot").textContent = "No project";
      document.getElementById("projectTree").innerHTML = '<div class="tree-placeholder">Select a folder to load project</div>';
    }
    
  } catch (error) {
    console.error("Error loading agent status:", error);
  }
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
    
    // Format message with code blocks
    const formattedContent = formatMessageWithCode(m.content);
    const senderName = m.role_name === "user" ? "You" : currentAgentName;
    
    div.innerHTML = `
      <div class="message-content">${formattedContent}</div>
    `;
    
    chat.appendChild(div);
  });

  chat.scrollTop = chat.scrollHeight;
  
}

// ######### Format Code Functions #########

function formatMessageWithCode(text) {
  if (!text) return '';
   
  let formatted = text;
  
  // "language\nCopy\ncode"
  formatted = formatted.replace(/(\w+)\nCopy\n([\s\S]*?)(?=\n\n|\n$|$)/g, (match, language, code) => {
    return `
      <div class="code-block">
        <pre><code>${escapeHtml(code.trim())}</code></pre>
      </div>
    `;
  });
  
  // ```language\ncode\n```
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
    return `
      <div class="code-block">
        <pre><code>${escapeHtml(code.trim())}</code></pre>
      </div>
    `;
  });

  // br
  formatted = formatted.replace(/\n/g, '<br>');
  
  // `código`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  //  **texto** 
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // *texto* ou _texto_
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // 6. (*, -, •)
  formatted = formatted.replace(/^\s*[-*•]\s+(.+)$/gm, '<li>$1</li>');
  
  
  return formatted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ######### Format Code Functions #########

// ######### Chat #########

async function clearHistory() {
  try {
    const res = await api("/all_messages", {
      method: "DELETE",
      headers: {
        "x-session-id": currentSessionId
      },
      body: currentSessionId
    });

    document.getElementById("chat").innerHTML = "";
    hideClearHistoryModal();
    
    const messageCount = document.getElementById("fileCount");
    if (messageCount) {
      messageCount.textContent = "0 files";
    }
    
  } catch (error) {
    console.error("Failed to clear history:", error);
    hideClearHistoryModal();
    alert("Failed to clear chat history. Please try again.");
  }
}

// ######### Modal Functions for Clear History #########

function showClearHistoryModal() {
  const modal = document.getElementById("clearHistoryModal");
  const message = document.getElementById("clearHistoryMessage");
  
  if (modal && message) {
    modal.style.display = "flex";
  }
}

function hideClearHistoryModal() {
  const modal = document.getElementById("clearHistoryModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function setupClearHistoryModal() {
  const modal = document.getElementById("clearHistoryModal");
  const cancelBtn = document.getElementById("clearModalCancel");
  const confirmBtn = document.getElementById("clearModalConfirm");
  
  if (!modal || !cancelBtn || !confirmBtn) return;
  
  cancelBtn.onclick = hideClearHistoryModal;
  
  confirmBtn.onclick = clearHistory;
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      hideClearHistoryModal();
    }
  };
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideClearHistoryModal();
    }
  }, { once: true });
  
  modal.addEventListener('animationend', () => {
    if (modal.style.display === 'none') {
      document.removeEventListener('keydown', arguments.callee);
    }
  });
}

// ######### Modal Functions for Clear History #########


async function pickProjectFolder() {
  const handle = await window.showDirectoryPicker();
  await saveHandle(currentSessionId, handle);
  const entries = await buildTree(handle);
  const bodyInfo = {
    "rootName": handle.name,
    "tree": entries,
  };
  
  await api("/project_context", {
    method: "POST",
    headers: {
      "x-session-id": currentSessionId
    },
    body: JSON.stringify(bodyInfo)
  });
  
  await loadAgentStatus(currentSessionId);
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

  const userDiv = document.createElement("div");
  userDiv.className = "msg user";
  userDiv.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
  `;
  chat.appendChild(userDiv);
  
  input.value = "";
  chat.scrollTop = chat.scrollHeight;

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
      renderFileApprovalModal(data);
    }
  } else {
    await renderStream(chat, res);
  }

  await loadAgentStatus(currentSessionId);
}

async function renderStream(chat, res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  const streamId = 'streaming_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  let botDiv = document.createElement("div");
  botDiv.className = "msg bot";
  botDiv.id = streamId; 
  botDiv.innerHTML = `
    <div class="message-content" id="${streamId}_content"></div>
  `;
  
  chat.appendChild(botDiv);
  
  let streamingContent = document.getElementById(streamId + '_content');
  let buffer = "";
  let partialContent = "";

  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.replace("data:", "").trim();
      if (payload === "[DONE]") {
        streamingContent.innerHTML = formatMessageWithCode(partialContent);
        
        setTimeout(() => {
          chat.scrollTop = chat.scrollHeight;
        }, 50);
        
        return;
      }

      try {
        const json = JSON.parse(payload);
        if (json.response) {
          partialContent += json.response;
          streamingContent.innerHTML = formatPartialMessage(partialContent);
          
          setTimeout(() => {
            chat.scrollTop = chat.scrollHeight;
          }, 10);
        }
      } catch {}
    }
  }
}

function formatPartialMessage(text) {
  let formatted = text;
  
  formatted = formatted.replace(/(\w+)\nCopy\n([\s\S]*?)(?=\n\n|\n$|$)/g, (match, language, code) => {
    return `<div class="code-block partial"><pre><code>${escapeHtml(code.trim())}</code></pre></div>`;
  });
  
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
    return `<div class="code-block partial"><pre><code>${escapeHtml(code.trim())}</code></pre></div>`;
  });

  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// ######### File Approval Modal #########

function renderFileApprovalModal(data) {
  // Guardar os dados para usar depois
  window.pendingFileApprovalData = data;
  
  // Adicionar modal ao HTML se não existir
  if (!document.getElementById("fileApprovalModal")) {
    const modalHTML = `
      <div id="fileApprovalModal" class="modal-overlay" style="display: none;">
        <div class="modal-content file-approval-modal">
          <div class="modal-icon">
          </div>
          <h3>File Access Required</h3>
          <div class="file-approval-content">
            <div class="file-approval-reason">
              <strong>Reason:</strong> <span id="fileReason">${data.reason}</span>
            </div>
            <div class="file-approval-files">
              <strong>Files needed:</strong>
              <ul id="fileList">
                ${data.files.map(file => `<li>${file}</li>`).join('')}
              </ul>
            </div>
            <div class="file-approval-warning">
              <span>The assistant will read the content of these files to provide better assistance.</span>
            </div>
          </div>
          <div class="modal-buttons">
            <button id="fileModalCancel" class="modal-btn modal-cancel">Deny Access</button>
            <button id="fileModalApprove" class="modal-btn modal-approve">Approve</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar eventos
    setupFileApprovalModal();
  }
  
  // Atualizar conteúdo do modal
  document.getElementById("fileReason").textContent = data.reason;
  
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = data.files.map(file => `<li>${file}</li>`).join('');
  
  // Mostrar modal
  showFileApprovalModal();
}

function showFileApprovalModal() {
  const modal = document.getElementById("fileApprovalModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function hideFileApprovalModal() {
  const modal = document.getElementById("fileApprovalModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function approveFileAccess() {
  const data = window.pendingFileApprovalData;
  if (!data || !currentSessionId) return;
  
  hideFileApprovalModal();
  
  // Voltar para o chat
  await openSession(currentSessionId);
  const chat = document.getElementById("chat");
  
  try {
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
    
  } catch (error) {
    console.error("Error reading files:", error);
    const errorDiv = document.createElement("div");
    errorDiv.className = "msg bot";
    errorDiv.innerHTML = `
      <div class="message-sender">${currentAgentName}</div>
      <div class="message-content">Error: Could not read the requested files. Please try again.</div>
    `;
    chat.appendChild(errorDiv);
    chat.scrollTop = chat.scrollHeight;
  }
  

  window.pendingFileApprovalData = null;
}

async function denyFileAccess() {
  const data = window.pendingFileApprovalData;
  if (!data || !currentSessionId) return;
  
  hideFileApprovalModal();
  
  await openSession(currentSessionId);
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

  window.pendingFileApprovalData = null;
}

function setupFileApprovalModal() {
  const modal = document.getElementById("fileApprovalModal");
  const cancelBtn = document.getElementById("fileModalCancel");
  const approveBtn = document.getElementById("fileModalApprove");
  
  if (!modal || !cancelBtn || !approveBtn) return;
  
  cancelBtn.onclick = denyFileAccess;
  approveBtn.onclick = approveFileAccess;
  
  modal.onclick = (e) => {
    if (e.target === modal) {

    }
  };
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      e.preventDefault();
    }
  });
}

// ######### File Approval Modal #########

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


// ####### Files Render #######
function renderFileTree(tree) {
  const container = document.getElementById("projectTree");
  
  if (!tree || tree.length === 0) {
    container.innerHTML = '<div class="tree-placeholder">No files in project</div>';
    document.getElementById("fileCount").textContent = "0 files";
    return;
  }
  
  const fileTree = buildHierarchy(tree);
  const fileCount = tree.filter(item => item.type === "file").length;
  
  document.getElementById("fileCount").textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
  
  let html = '<div class="tree-container">';
  html += renderTreeNodes(fileTree);
  html += '</div>';
  
  container.innerHTML = html;
  
  document.querySelectorAll('.folder-node').forEach(folder => {
    folder.addEventListener('click', function(e) {
      if (!e.target.closest('.folder-toggle')) return;
      const children = this.nextElementSibling;
      const toggle = this.querySelector('.folder-toggle');
      
      if (children.classList.contains('expanded')) {
        children.classList.remove('expanded');
        toggle.textContent = '▶';
      } else {
        children.classList.add('expanded');
        toggle.textContent = '▼';
      }
    });
  });
}

function buildHierarchy(items) {
  const root = {};
  
  items.forEach(item => {
    const parts = item.path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (!current[part]) {
        current[part] = isLast 
          ? { type: item.type }
          : { type: 'dir', children: {} };
      }
      
      if (!isLast) {
        current = current[part].children;
      }
    }
  });
  
  return root;
}

function renderTreeNodes(node, level = 0) {
  let html = '';
  const entries = Object.entries(node).sort((a, b) => {
    // Pastas primeiro, depois arquivos
    if (a[1].type === 'dir' && b[1].type !== 'dir') return -1;
    if (a[1].type !== 'dir' && b[1].type === 'dir') return 1;
    return a[0].localeCompare(b[0]);
  });
  
  entries.forEach(([name, data]) => {
    const indent = '  '.repeat(level);
    const isDir = data.type === 'dir';
    
    if (isDir) {
      html += `
        <div class="folder-node" style="padding-left: ${level * 16}px">
          <span class="folder-toggle">▶</span>
          <span class="folder-icon">📁</span>
          <span class="node-name">${name}</span>
        </div>
        <div class="folder-children">
          ${renderTreeNodes(data.children, level + 1)}
        </div>
      `;
    } else {
      let icon = '📄';     
      html += `
        <div class="file-node" style="padding-left: ${level * 16 + 20}px" title="${name}">
          <span class="file-icon">${icon}</span>
          <span class="node-name">${name}</span>
        </div>
      `;
    }
  });
  
  return html;
}
// ####### Files Render #######


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