import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { PTYManager } from './pty-manager';
import { ResizeMessage, TerminalDimensions } from './types';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_DIR = join(__dirname, '../../client/dist');

// MIME types for static files
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Serve static files from client/dist
 */
function serveStaticFile(req: IncomingMessage, res: ServerResponse): void {
  let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';

  // Remove query string
  const queryIndex = filePath.indexOf('?');
  if (queryIndex !== -1) {
    filePath = filePath.substring(0, queryIndex);
  }

  const fullPath = join(CLIENT_DIR, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(CLIENT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Determine MIME type
  const ext = extname(fullPath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    console.error(`[HTTP] Error serving ${fullPath}:`, error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Create HTTP server for static files
const httpServer = createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  serveStaticFile(req, res);
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server: httpServer });

// Track active connections
const connections = new Map<WebSocket, PTYManager>();

console.log('[Server] Starting WebSocket server...');

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] New connection from ${clientIp}`);

  // Parse initial terminal dimensions from query string
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const cols = parseInt(url.searchParams.get('cols') || '80', 10);
  const rows = parseInt(url.searchParams.get('rows') || '24', 10);

  const dimensions: TerminalDimensions = { cols, rows };

  try {
    // Create PTY manager for this connection
    const ptyManager = new PTYManager(dimensions);
    connections.set(ws, ptyManager);

    // PTY -> WebSocket (send terminal output to client)
    ptyManager.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // PTY exit handler
    ptyManager.onExit((code: number) => {
      console.log(`[PTY] Process exited with code ${code}`);
      ws.close(1000, `PTY exited with code ${code}`);
    });

    // WebSocket -> PTY (handle messages from client)
    ws.on('message', (data: Buffer) => {
      try {
        // Try to parse as JSON control message
        const message = JSON.parse(data.toString()) as ResizeMessage;

        if (message.type === 'resize') {
          console.log(`[WebSocket] Resize request: ${message.cols}x${message.rows}`);
          ptyManager.resize(message.cols, message.rows);
          return;
        }
      } catch {
        // Not JSON, treat as regular terminal input
      }

      // Regular terminal input - write to PTY
      ptyManager.write(data.toString());
    });

    // Cleanup on WebSocket close
    ws.on('close', (code, reason) => {
      console.log(
        `[WebSocket] Connection closed: ${code} ${reason.toString()}`
      );
      ptyManager.kill();
      connections.delete(ws);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      ptyManager.kill();
      connections.delete(ws);
    });
  } catch (error) {
    console.error('[WebSocket] Error creating PTY:', error);
    ws.close(1011, 'Failed to create PTY');
  }
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`[Server] HTTP and WebSocket server running on port ${PORT}`);
  console.log(`[Server] Serving static files from ${CLIENT_DIR}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, closing server...');

  // Close all WebSocket connections
  connections.forEach((ptyManager, ws) => {
    ptyManager.kill();
    ws.close(1001, 'Server shutting down');
  });

  wss.close(() => {
    httpServer.close(() => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, closing server...');
  process.exit(0);
});
