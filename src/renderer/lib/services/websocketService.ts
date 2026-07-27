import { WS_BASE_URL } from '../config';

export type WSEventHandler = (payload: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<WSEventHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private token: string | null = null;

  public connect(token?: string): void {
    if (token) {
      this.token = token;
    }
    const activeToken = this.token || sessionStorage.getItem('token');

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    const wsUrl = activeToken
      ? `${WS_BASE_URL}?token=${encodeURIComponent(activeToken)}`
      : WS_BASE_URL;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type || data.event;
          if (type) {
            this.dispatch(type, data.payload ?? data);
          }
        } catch {
          // Ignore invalid JSON frames
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public registerHandler(eventType: string, handler: WSEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  public unregisterHandler(eventType: string, handler: WSEventHandler): void {
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public send(type: string, payload?: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private dispatch(eventType: string, payload: any): void {
    const handlerSet = this.handlers.get(eventType);
    if (handlerSet) {
      handlerSet.forEach((handler) => handler(payload));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}

export const websocketService = new WebSocketService();
