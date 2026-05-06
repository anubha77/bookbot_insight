const chatBox = document.getElementById("chat-box");
const inputField = document.getElementById("user-input");
const chatForm = document.getElementById("chat-form");
const sendButton = document.getElementById("send-btn");

function appendMessage(sender, text, type = "normal") {
    const message = document.createElement("div");
    const senderLabel = document.createElement("p");
    const messageText = document.createElement("p");

    message.classList.add("message");
    message.classList.add(sender === "You" ? "user-message" : "bot-message");
    senderLabel.classList.add("message-label");
    messageText.classList.add("message-text");

    if (type === "error") {
        message.classList.add("error-message");
    }

    senderLabel.textContent = sender;
    messageText.textContent = text;
    message.appendChild(senderLabel);
    message.appendChild(messageText);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "Sending..." : "Send";
    inputField.disabled = isLoading;
    chatForm.classList.toggle("is-loading", isLoading);
    inputField.setAttribute("aria-busy", String(isLoading));
}

async function sendMessage() {
    const userText = inputField.value.trim();
    if (!userText) return;

    appendMessage("You", userText);
    inputField.value = "";
    setLoading(true);

    try {
        const response = await fetch("http://localhost:5000/query", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: userText })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const botAnswer = data?.answer || "I could not find an answer for that.";
        appendMessage("Bot", botAnswer);
    } catch (error) {
        appendMessage("Error", "Unable to connect to the server. Please try again.", "error");
    } finally {
        setLoading(false);
        inputField.focus();
    }
}

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
});

appendMessage("BookBot", "Hi! Ask me anything about your book.");