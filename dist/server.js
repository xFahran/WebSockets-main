"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const fs_1 = require("fs");
const path_1 = require("path");
const https_1 = __importDefault(require("https"));
const app = (0, express_1.default)();
const privateKey = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../cert/ficomatique.fr.key'), 'utf8');
const certificate = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../cert/ficomatique.fr.crt'), 'utf8');
const credentials = { key: privateKey, cert: certificate };
const server = https_1.default.createServer(credentials, app);
const wss = new ws_1.WebSocketServer({ server });
const clients = [];
const messages = [];
let clientId = 0;
let messageId = 0;
const badWords = [
    "merde", "con", "connard", "connasse", "putain", "salope", "enculé", "enculer",
    "foutre", "pute", "bordel", "ta gueule", "fdp", "ntm", "batard", "bite", "couilles",
    "chier", "chiant", "niquer", "nique", "salaud", "salauds", "salope", "salopes",
    "conne", "connard", "connards", "pd", "pédé", "tarlouze", "tapette", "trouduc"
];
function censorMessage(message) {
    const regex = new RegExp(`\\b(${badWords.join('|')})\\b`, 'gi');
    return message.replace(regex, match => '*'.repeat(match.length));
}
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
app.use(express_1.default.static((0, path_1.join)(__dirname, '../public')));
app.use('/dist', express_1.default.static((0, path_1.join)(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile((0, path_1.join)(__dirname, '../public/index.html'));
});
app.get('*', (req, res) => {
    res.sendFile((0, path_1.join)(__dirname, '../dist/script.js'));
});
wss.on('connection', (ws) => {
    let currentClient = null;
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'setName') {
            const escapedName = escapeHtml(data.name);
            currentClient = { id: clientId++, name: escapedName, color: data.color, ws };
            clients.push(currentClient);
            ws.send(JSON.stringify({ type: 'setUserId', userId: currentClient.id }));
            broadcast({ type: 'system', message: `${escapedName} a rejoint le chat` });
        }
        else if (data.type === 'message' && currentClient) {
            const censoredMessage = censorMessage(data.message);
            const escapedMessage = escapeHtml(censoredMessage);
            const newMessage = {
                id: messageId++,
                clientId: currentClient.id,
                name: currentClient.name,
                message: escapedMessage,
                color: currentClient.color
            };
            messages.push(newMessage);
            broadcast({ type: 'message', id: newMessage.id, clientId: newMessage.clientId, name: newMessage.name, message: newMessage.message, color: newMessage.color });
        }
        else if (data.type === 'deleteMessage' && currentClient) {
            const messageToDelete = messages.find(m => m.id === data.id && m.clientId === currentClient.id);
            if (messageToDelete) {
                broadcast({ type: 'deleteMessage', id: data.id });
                messages.splice(messages.indexOf(messageToDelete), 1);
                broadcast({ type: 'system', message: `${currentClient.name} a supprimé son message` });
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
function broadcast(data) {
    clients.forEach(client => {
        client.ws.send(JSON.stringify(data));
    });
}
server.listen(3505, () => {
    console.log('Serveur en écoute sur le port 3505');
});
