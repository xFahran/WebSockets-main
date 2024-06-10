let ws: WebSocket;
let userName = '';
let userColor = '';
let userId: number | null = null;

const messagesContainer = document.getElementById('messages') as HTMLDivElement;

const setupWebSocket = () => {
  ws = new WebSocket('wss://localhost:3505');

  ws.onmessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message') {
      addMessage(data.id, escapeHtml(data.name), escapeHtml(data.message), data.color, data.clientId);
    } else if (data.type === 'system') {
      addSystemMessage(escapeHtml(data.message));
    } else if (data.type === 'deleteMessage') {
      deleteMessageElement(data.id);
    } else if (data.type === 'setUserId') {
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

  ws.onclose = () => {};
};

const addMessage = (id: number, name: string, message: string, color: string, clientId: number) => {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message-container');
  messageElement.id = `message-${id}`;
  messageElement.innerHTML = `
    <p><strong style="color:${color};">${name}:</strong> ${message}</p>
    ${clientId === userId ? `<span class="delete-icon" onclick="deleteMessage(${id})">&#128465;</span>` : ''}
  `;
  messagesContainer.appendChild(messageElement);
};

const addSystemMessage = (message: string) => {
  const systemMessage = document.createElement('p');
  systemMessage.innerHTML = `<em>${message}</em>`;
  messagesContainer.appendChild(systemMessage);
};

const deleteMessageElement = (id: number) => {
  const messageElement = document.getElementById(`message-${id}`);
  if (messageElement) {
    messageElement.remove();
  }
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const sendMessage = () => {
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const messageInput = document.getElementById('message') as HTMLInputElement;

  if (userName === '') {
    const nameValue = nameInput.value.trim();
    userColor = generateRandomColor();
    if (nameValue !== '') {
      ws.send(JSON.stringify({ type: 'setName', name: escapeHtml(nameValue), color: userColor }));
      userName = nameValue;
      nameInput.style.display = 'none';
      messageInput.style.display = 'inline';
    }
  } else {
    const message = messageInput.value.trim();
    if (message !== '') {
      ws.send(JSON.stringify({ type: 'message', message: escapeHtml(message), color: userColor }));
      messageInput.value = '';
    }
  }
};

const deleteMessage = (id: number) => {
  ws.send(JSON.stringify({ type: 'deleteMessage', id }));
};

document.getElementById('send')!.addEventListener('click', () => {
  sendMessage();
});

document.getElementById('name')!.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

document.getElementById('message')!.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

setupWebSocket();
