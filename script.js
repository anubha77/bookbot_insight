const chatBox = document.getElementById("chat-box");
const inputField = document.getElementById("user-input");
const chatForm = document.getElementById("chat-form");
const sendButton = document.getElementById("send-btn");
const bookSelect = document.getElementById("book-select");
const refreshBooksButton = document.getElementById("refresh-books-btn");
const uploadForm = document.getElementById("upload-form");
const bookTitleInput = document.getElementById("book-title");
const bookAuthorInput = document.getElementById("book-author");
const bookFileInput = document.getElementById("book-file");
const uploadButton = document.getElementById("upload-btn");
const booksHelp = document.getElementById("books-help");

const API_BASE_URL = "http://127.0.0.1:5000";
let selectedBookId = "";

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

function setBookSaving(isSaving) {
    uploadButton.disabled = isSaving;
    uploadButton.textContent = isSaving ? "Uploading..." : "Upload Book File";
    bookTitleInput.disabled = isSaving;
    bookAuthorInput.disabled = isSaving;
    bookFileInput.disabled = isSaving;
}

function renderBookOptions(books) {
    bookSelect.innerHTML = "";
    if (!books.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No books uploaded yet";
        bookSelect.appendChild(option);
        selectedBookId = "";
        booksHelp.textContent = "Upload a PDF/TXT/MD file from above to start chatting.";
        return;
    }

    books.forEach((book, index) => {
        const option = document.createElement("option");
        option.value = book._id;
        option.textContent = `${book.title}${book.author ? ` - ${book.author}` : ""}`;
        if (index === 0) {
            selectedBookId = book._id;
            option.selected = true;
        }
        bookSelect.appendChild(option);
    });
    booksHelp.textContent = "Pick a book from the list and ask questions in the chat panel.";
}

async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        const books = await response.json();
        renderBookOptions(books);
    } catch (error) {
        renderBookOptions([]);
        booksHelp.textContent = "Backend is unreachable. Start Node API and MongoDB, then click Reload Books.";
        appendMessage("Error", "Could not load books from backend. Make sure Node API is running on http://127.0.0.1:5000.", "error");
    }
}

async function uploadBook(event) {
    event.preventDefault();
    const title = bookTitleInput.value.trim();
    const author = bookAuthorInput.value.trim();
    const file = bookFileInput.files?.[0];
    if (!file) {
        appendMessage("BookBot", "Please choose a file before uploading.", "error");
        return;
    }

    const formData = new FormData();
    formData.append("bookFile", file);
    if (title) {
        formData.append("title", title);
    }
    if (author) {
        formData.append("author", author);
    }

    setBookSaving(true);
    try {
        const response = await fetch(`${API_BASE_URL}/books/upload`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const createdBook = await response.json();
        bookTitleInput.value = "";
        bookAuthorInput.value = "";
        bookFileInput.value = "";
        await loadBooks();
        selectedBookId = createdBook._id;
        bookSelect.value = createdBook._id;
        appendMessage("BookBot", `Uploaded "${createdBook.title}". You can now ask questions.`);
    } catch (error) {
        appendMessage("Error", "Failed to upload book file. Check backend connection.", "error");
    } finally {
        setBookSaving(false);
    }
}

async function sendMessage() {
    const userText = inputField.value.trim();
    if (!userText) return;
    if (!selectedBookId) {
        appendMessage("BookBot", "Please add/select a book first.", "error");
        return;
    }

    appendMessage("You", userText);
    inputField.value = "";
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bookId: selectedBookId, query: userText })
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

uploadForm.addEventListener("submit", uploadBook);
refreshBooksButton.addEventListener("click", loadBooks);
bookSelect.addEventListener("change", () => {
    selectedBookId = bookSelect.value;
});

loadBooks();
appendMessage("BookBot", "Hi! Upload a book from the left panel, then ask me anything.");