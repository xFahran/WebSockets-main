import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join } from 'path';
import https from 'https';

const app = express();

const privateKey = readFileSync(join(__dirname, '../cert/ficomatique.fr.key'), 'utf8');
const certificate = readFileSync(join(__dirname, '../cert/ficomatique.fr.crt'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);
const wss = new WebSocketServer({ server });

interface Client {
  id: number;
  name: string;
  color: string;
  ws: WebSocket;
}

interface Message {
  id: number;
  clientId: number;
  name: string;
  message: string;
  color: string;
}

const clients: Client[] = [];
const messages: Message[] = [];
let clientId = 0;
let messageId = 0;

const badWords = [
  "merde", "con", "connard", "connasse", "putain", "salope", "enculé", "enculer", 
  "foutre", "pute", "bordel", "ta gueule", "fdp", "ntm", "batard", "bite", "couilles",
  "chier", "chiant", "niquer", "nique", "salaud", "salauds", "salope", "salopes",
  "conne", "connard", "connards", "pd", "pédé", "tarlouze", "tapette", "trouduc"
];

function censorMessage(message: string): string {
  const regex = new RegExp(`\\b(${badWords.join('|')})\\b`, 'gi');
  return message.replace(regex, match => '*'.repeat(match.length));
}

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

app.use(express.static(join(__dirname, '../public')));
app.use('/dist', express.static(join(__dirname, '../dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

wss.on('connection', (ws: WebSocket) => {
  let currentClient: Client | null = null;

  ws.on('message', (message: string) => {
    const data = JSON.parse(message);

    if (data.type === 'setName') {
      const escapedName = escapeHtml(data.name);
      currentClient = { id: clientId++, name: escapedName, color: data.color, ws };
      clients.push(currentClient);
      ws.send(JSON.stringify({ type: 'setUserId', userId: currentClient.id }));
      broadcast({ type: 'system', message: `${escapedName} a rejoint le chat` });
    } else if (data.type === 'message' && currentClient) {
      const censoredMessage = censorMessage(data.message);
      const escapedMessage = escapeHtml(censoredMessage);
      const newMessage: Message = {
        id: messageId++,
        clientId: currentClient.id,
        name: currentClient.name,
        message: escapedMessage,
        color: currentClient.color
      };
      messages.push(newMessage);
      broadcast({ type: 'message', id: newMessage.id, clientId: newMessage.clientId, name: newMessage.name, message: newMessage.message, color: newMessage.color });
    } else if (data.type === 'deleteMessage' && currentClient) {
      const messageToDelete = messages.find(m => m.id === data.id && m.clientId === currentClient!.id);
      if (messageToDelete) {
        broadcast({ type: 'deleteMessage', id: data.id });
        messages.splice(messages.indexOf(messageToDelete), 1);
        broadcast({ type: 'system', message: `${currentClient!.name} a supprimé son message` });
      }
    }
  });

  ws.on('close', () => {
    if (currentClient) {
      clients.splice(clients.indexOf(currentClient), 1);
      broadcast({ type: 'system', message: `${currentClient.name} s'est déconnecté` });
    }
  });
});

function broadcast(data: any) {
  clients.forEach(client => {
    client.ws.send(JSON.stringify(data));
  });
}

server.listen(3505, () => {
  console.log('Serveur en écoute sur le port 3505');
});
