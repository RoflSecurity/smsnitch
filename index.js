// termux-sms websocket client (listener)
// npm install ws

const WebSocket = require('ws');

// ⚠️ remplace par ton IP Termux
const SERVER_URL = 'ws://192.168.1.119:3000';

function connect() {
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    console.log('[WS] Connected to server');

    ws.send(JSON.stringify({
      type: 'client-ready',
      client: 'termux-sms-list'
    }));
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'sms-send') {
        const { to, text } = data.data || {};

        console.log('\n--- SMS EVENT ---');
        console.log('To   :', to);
        console.log('Text :', text);
        console.log('-----------------\n');

        // Si tu es sur Termux et veux envoyer le SMS automatiquement :
        // const { exec } = require('child_process');
        // exec(`termux-sms-send -n "${to}" "${text}"`);

      } else {
        console.log('[WS]', data);
      }
    } catch (e) {
      console.log('[WS RAW]', message.toString());
    }
  });

  ws.on('close', () => {
    console.log('[WS] Disconnected. Reconnecting in 3s...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    console.log('[WS ERROR]', err.message);
  });
}

connect();
