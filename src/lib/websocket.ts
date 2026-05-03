/**
 * WebSocket client for real-time screenplay collaboration.
 *
 * Connects to the Django Channels backend and syncs editor changes
 * between multiple clients in real time.
 *
 * Features:
 *  - Auto-reconnection with exponential backoff
 *  - Message queuing during disconnection
 *  - Typed event handling
 */

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export type WSMessageType =
  | "content_update"
  | "cursor_move"
  | "element_update"
  | "element_insert"
  | "element_delete"
  | "user_joined"
  | "user_left";

export interface WSMessage {
  type: WSMessageType;
  [key: string]: unknown;
}

type MessageHandler = (message: WSMessage) => void;

export class ScriptWebSocket {
  private ws: WebSocket | null = null;
  private scriptId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000; // 1 second
  private messageQueue: WSMessage[] = [];
  private handlers: Map<WSMessageType | "*", Set<MessageHandler>> = new Map();
  private isIntentionalClose = false;

  constructor(scriptId: string) {
    this.scriptId = scriptId;
  }

  // ─── Connection management ──────────────────────────────────────────

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE}/ws/scripts/${this.scriptId}/`;
    this.ws = new WebSocket(url);
    this.isIntentionalClose = false;

    this.ws.onopen = () => {
      console.log(`[WS] Connected to script ${this.scriptId}`);
      this.reconnectAttempts = 0;
      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        this.send(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.emit(message.type, message);
        this.emit("*" as WSMessageType, message);
      } catch (err) {
        console.error("[WS] Failed to parse message:", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code: ${event.code})`);
      if (!this.isIntentionalClose) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.ws?.close(1000, "Client disconnect");
    this.ws = null;
    this.messageQueue = [];
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WS] Max reconnection attempts reached.");
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 500;
    this.reconnectAttempts++;

    console.log(
      `[WS] Reconnecting in ${Math.round(delay + jitter)}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => this.connect(), delay + jitter);
  }

  // ─── Messaging ──────────────────────────────────────────────────────

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue for later delivery
      this.messageQueue.push(message);
    }
  }

  /** Send a content update to all collaborators. */
  sendContentUpdate(content: string): void {
    this.send({
      type: "content_update",
      content,
      timestamp: Date.now(),
    });
  }

  /** Send cursor position to all collaborators. */
  sendCursorMove(position: { from: number; to: number }): void {
    this.send({
      type: "cursor_move",
      position,
    });
  }

  // ─── Event handling ─────────────────────────────────────────────────

  on(type: WSMessageType | "*", handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: WSMessageType | "*", handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  private emit(type: WSMessageType | "*", message: WSMessage): void {
    this.handlers.get(type)?.forEach((handler) => {
      try {
        handler(message);
      } catch (err) {
        console.error(`[WS] Handler error for "${type}":`, err);
      }
    });
  }

  // ─── State ──────────────────────────────────────────────────────────

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}
