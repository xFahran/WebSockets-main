"use strict";
let ws;
let userName = '';
let userColor = '';
let userId = null;
const messagesContainer = document.getElementById('messages');
const setupWebSocket = () => {
    ws = new WebSocket('wss://localhost:3505');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
            addMessage(data.id, escapeHtml(data.name), escapeHtml(data.message), data.color, data.clientId);
        }
        else if (data.type === 'system') {
            addSystemMessage(escapeHtml(data.message));
        }
        else if (data.type === 'deleteMessage') {
            deleteMessageElement(data.id);
        }
        else if (data.type === 'setUserId') {
            userId = data.userId;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'requestUserId' }));
    };
    ws.onerror = (error) => {
        console.error('WebSocket Error: ', error);
    };
    ws.onclose = () => { };
};
const addMessage = (id, name, message, color, clientId) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-container');
    messageElement.id = `message-${id}`;
    messageElement.innerHTML = `
    <p><strong style="color:${color};">${name}:</strong> ${message}</p>
    ${clientId === userId ? `<span class="delete-icon" onclick="deleteMessage(${id})">&#128465;</span>` : ''}
  `;
    messagesContainer.appendChild(messageElement);
};
const addSystemMessage = (message) => {
    const systemMessage = document.createElement('p');
    systemMessage.innerHTML = `<em>${message}</em>`;
    messagesContainer.appendChild(systemMessage);
};
const deleteMessageElement = (id) => {
    const messageElement = document.getElementById(`message-${id}`);
    if (messageElement) {
        messageElement.remove();
    }
};
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
const generateRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};
const sendMessage = () => {
    const nameInput = document.getElementById('name');
    const messageInput = document.getElementById('message');
    if (userName === '') {
        const nameValue = nameInput.value.trim();
        userColor = generateRandomColor();
        if (nameValue !== '') {
            ws.send(JSON.stringify({ type: 'setName', name: escapeHtml(nameValue), color: userColor }));
            userName = nameValue;
            nameInput.style.display = 'none';
            messageInput.style.display = 'inline';
        }
    }
    else {
        const message = messageInput.value.trim();
        if (message !== '') {
            ws.send(JSON.stringify({ type: 'message', message: escapeHtml(message), color: userColor }));
            messageInput.value = '';
        }
    }
};
const deleteMessage = (id) => {
    ws.send(JSON.stringify({ type: 'deleteMessage', id }));
};
document.getElementById('send').addEventListener('click', () => {
    sendMessage();
});
document.getElementById('name').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
document.getElementById('message').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
setupWebSocket();
