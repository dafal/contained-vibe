import { TerminalManager } from './terminal';
import { WebSocketClient } from './websocket';
import './styles.css';
import '@xterm/xterm/css/xterm.css';

// Get terminal container
const terminalContainer = document.getElementById('terminal');
if (!terminalContainer) {
  throw new Error('Terminal container not found');
}

// Initialize terminal
const terminal = new TerminalManager(terminalContainer);

// Determine WebSocket URL
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const wsUrl = `${protocol}//${host}?cols=${terminal.dimensions.cols}&rows=${terminal.dimensions.rows}`;

console.log(`[App] Connecting to ${wsUrl}`);

// Initialize WebSocket client
const wsClient = new WebSocketClient(
  wsUrl,
  // onOpen
  (ws) => {
    console.log('[App] WebSocket connected');

    // Attach WebSocket to terminal using AttachAddon
    // This handles bidirectional I/O without local echo
    terminal.attachWebSocket(ws);

    // Focus terminal
    terminal.focus();
  },
  // onMessage - Not used anymore, AttachAddon handles all terminal I/O
  (_data) => {
    // AttachAddon manages terminal output directly
  },
  // onClose
  () => {
    console.log('[App] WebSocket closed');
  },
  // onError
  (error) => {
    console.error('[App] WebSocket error:', error);
  }
);

// Connect to WebSocket
wsClient.connect();

// Handle terminal resize
let resizeTimeout: number | undefined;
window.addEventListener('resize', () => {
  // Debounce resize events
  if (resizeTimeout !== undefined) {
    clearTimeout(resizeTimeout);
  }

  resizeTimeout = window.setTimeout(() => {
    terminal.fit();
    wsClient.sendResize(terminal.dimensions);
  }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  wsClient.disconnect();
  terminal.dispose();
});

// Global access for debugging
(window as any).terminal = terminal;
(window as any).wsClient = wsClient;
