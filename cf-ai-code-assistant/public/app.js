const chat = document.getElementById("chat");
const input = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");

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

    const answer = await response.text();
    addMessage("bot", answer);

  } catch (err) {
    addMessage("bot", "Error contacting assistant.");
    console.error(err);
  }
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
