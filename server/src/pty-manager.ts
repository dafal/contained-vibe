import * as pty from 'node-pty';
import { IPty } from 'node-pty';
import { TerminalDimensions } from './types';

export class PTYManager {
  private ptyProcess: IPty;
  private dataCallbacks: ((data: string) => void)[] = [];
  private exitCallbacks: ((code: number) => void)[] = [];

  constructor(dimensions: TerminalDimensions) {
    const { cols, rows } = dimensions;

    // Spawn mistral-vibe in a PTY
    this.ptyProcess = pty.spawn('vibe', [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.WORKSPACE_DIR || '/workspace',
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // Ensure MISTRAL_API_KEY is passed through
        MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || '',
        // Set home for vibe config
        HOME: process.env.HOME || '/root',
      },
    });

    // Handle PTY data output
    this.ptyProcess.onData((data: string) => {
      this.dataCallbacks.forEach((cb) => cb(data));
    });

    // Handle PTY exit
    this.ptyProcess.onExit(({ exitCode }) => {
      this.exitCallbacks.forEach((cb) => cb(exitCode));
    });

    console.log(`[PTY] Spawned vibe process with PID ${this.ptyProcess.pid}`);
  }

  /**
   * Register callback for PTY data output
   */
  onData(callback: (data: string) => void): void {
    this.dataCallbacks.push(callback);
  }

  /**
   * Register callback for PTY exit
   */
  onExit(callback: (code: number) => void): void {
    this.exitCallbacks.push(callback);
  }

  /**
   * Write data to PTY (user input)
   */
  write(data: string): void {
    this.ptyProcess.write(data);
  }

  /**
   * Resize the PTY terminal
   */
  resize(cols: number, rows: number): void {
    // Validate dimensions to prevent crashes
    if (
      cols > 0 &&
      rows > 0 &&
      cols < 1000 &&
      rows < 500 &&
      Number.isInteger(cols) &&
      Number.isInteger(rows)
    ) {
      this.ptyProcess.resize(cols, rows);
      console.log(`[PTY] Resized to ${cols}x${rows}`);
    } else {
      console.warn(
        `[PTY] Invalid resize dimensions: ${cols}x${rows}, ignoring`
      );
    }
  }

  /**
   * Kill the PTY process
   */
  kill(): void {
    console.log(`[PTY] Killing process ${this.ptyProcess.pid}`);
    this.ptyProcess.kill();
  }

  /**
   * Get the PTY process ID
   */
  get pid(): number {
    return this.ptyProcess.pid;
  }
}
