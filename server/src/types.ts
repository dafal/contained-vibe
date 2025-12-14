export interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export interface TerminalDimensions {
  cols: number;
  rows: number;
}
