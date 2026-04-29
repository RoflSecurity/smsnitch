// index.js (CLIENT - SMS listener)

const WebSocket = require('ws');

// ⚠️ remplace IP Termux
const SERVER_URL = 'ws://192.168.1.119:3000';

function connect() {
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    console.log('[WS] connected');

    ws.send(JSON.stringify({
      type: 'client-ready',
      client: 'sms-listener'
    }));
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      if (data.type === 'sms-send') {
        console.log('\n[SMS OUT]');
        console.log('To:', data.data.to);
        console.log('Text:', data.data.text);
      }

      if (data.type === 'sms-inbox') {
        console.log('\n[SMS INBOX UPDATE]');
        console.log(data.data);
      }

    } catch (e) {
      console.log('[RAW]', msg.toString());
    }
  });

  ws.on('close', () => {
    console.log('[WS] disconnected, reconnecting...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    console.log('[WS ERROR]', err.message);
  });
}

connect();
