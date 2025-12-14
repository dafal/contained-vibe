import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { AttachAddon } from '@xterm/addon-attach';

export interface TerminalDimensions {
  cols: number;
  rows: number;
}

export class TerminalManager {
  private terminal: Terminal;
  private fitAddon: FitAddon;

  constructor(container: HTMLElement) {
    // Initialize xterm.js terminal
    this.terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
    });

    // Load addons
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());

    // Open terminal in container
    this.terminal.open(container);

    // Initial fit
    this.fitAddon.fit();

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    this.fitAddon.fit();
  }

  /**
   * Get current terminal dimensions
   */
  get dimensions(): TerminalDimensions {
    return {
      cols: this.terminal.cols,
      rows: this.terminal.rows,
    };
  }

  /**
   * Write data to terminal
   */
  write(data: string): void {
    this.terminal.write(data);
  }

  /**
   * Fit terminal to container size
   */
  fit(): void {
    this.fitAddon.fit();
  }

  /**
   * Focus the terminal
   */
  focus(): void {
    this.terminal.focus();
  }

  /**
   * Attach a WebSocket to the terminal for bidirectional I/O
   * This uses the AttachAddon to properly handle PTY connections
   * without local echo (preventing keystroke duplication)
   */
  attachWebSocket(ws: WebSocket): void {
    const attachAddon = new AttachAddon(ws);
    this.terminal.loadAddon(attachAddon);
  }

  /**
   * Register handler for terminal data (user input)
   */
  onData(callback: (data: string) => void): void {
    this.terminal.onData(callback);
  }

  /**
   * Clear the terminal
   */
  clear(): void {
    this.terminal.clear();
  }

  /**
   * Dispose terminal and cleanup
   */
  dispose(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.terminal.dispose();
  }
}
