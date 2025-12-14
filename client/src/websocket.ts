import { TerminalDimensions } from './terminal';

interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  constructor(
    private url: string,
    private onOpen: (ws: WebSocket) => void,
    private onMessage: (data: string) => void,
    private onClose: () => void,
    private onError: (error: Event) => void
  ) {}

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.onOpen(this.ws!);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        // Handle binary data (PTY output)
        if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder();
          const text = decoder.decode(event.data);
          this.onMessage(text);
        } else if (typeof event.data === 'string') {
          this.onMessage(event.data);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[WebSocket] Closed: ${event.code} ${event.reason}`);
        this.onClose();

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('[WebSocket] Error:', error);
        this.onError(error);
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !this.isIntentionallyClosed
    ) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (!this.isIntentionallyClosed) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '[WebSocket] Max reconnection attempts reached. Please refresh the page.'
      );
    }
  }

  /**
   * Send data to WebSocket (terminal input)
   */
  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('[WebSocket] Cannot send data, connection not open');
    }
  }

  /**
   * Send resize message to server
   */
  sendResize(dimensions: TerminalDimensions): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: ResizeMessage = {
        type: 'resize',
        cols: dimensions.cols,
        rows: dimensions.rows,
      };
      this.ws.send(JSON.stringify(message));
      console.log(`[WebSocket] Sent resize: ${dimensions.cols}x${dimensions.rows}`);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.maxReconnectAttempts = 0; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
