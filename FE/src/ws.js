/**
 * WebSocket singleton — connects to BE on ws://localhost:3001
 * Dispatches messages to the Zustand store.
 */

import { useStore } from './store';

let socket = null;
let reconnectTimer = null;

function connect() {
  if (socket && socket.readyState <= 1) return; // already connecting/open

  socket = new WebSocket('ws://localhost:3001');

  socket.onopen = () => {
    console.log('[WS] connected');
    clearTimeout(reconnectTimer);
  };

  socket.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    const store = useStore.getState();

    switch (msg.type) {
      case 'status':
        store.addLog(msg.message);
        break;

      case 'response':
        store.setResponse(msg.promptIdx, msg.ai, msg.text);
        store.addLog(`✓ ${msg.ai} response received`);
        break;

      case 'done':
        store.setRunState('done');
        store.addLog('Run complete');
        break;

      case 'stopped':
        store.setRunState('idle');
        store.addLog('Run stopped');
        break;

      case 'error':
        store.setRunState('error');
        store.addLog(`Error: ${msg.message}`);
        break;

      default:
        console.log('[WS] unknown message type:', msg.type);
    }
  };

  socket.onclose = () => {
    console.log('[WS] disconnected, retrying in 3s…');
    reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = (err) => {
    console.error('[WS] error', err);
  };
}

export function initWS() {
  connect();
}
