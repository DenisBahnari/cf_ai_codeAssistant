const chat = document.getElementById("chat");
const input = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
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


function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = `${role === "user" ? "You" : "Rob"}: ${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";

  try {
    const response = await fetch("/chat", {
      method: "POST",
      body: text
    });

    if (response.status === 204) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let agentDiv = document.createElement("div");
    agentDiv.className = "msg bot";
    agentDiv.textContent = "Rob: ";
    chat.appendChild(agentDiv);

    let currentMsg = "";

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        currentMsg += decoder.decode(value, {stream: true});

        const lines = currentMsg.split("\n");
        currentMsg = lines.pop() || "";

        for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.replace("data:", "").trim();
            if (payload === "[DONE]") return;

            try {
                const json = JSON.parse(payload);
                if (json.response) {
                    agentDiv.textContent += json.response;
                    chat.scrollTop = chat.scrollHeight;
                }
            } catch {
                // Just ingore the token
            }
        }
    }

  } catch (err) {
    addMessage("bot", "Error contacting assistant.");
    console.error(err);
  }
}

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

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});


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


