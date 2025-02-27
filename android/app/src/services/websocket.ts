import { Platform } from 'react-native';
import { EventEmitter } from 'events';
import { API_CONFIG } from '../config/api';

export enum WebSocketEvent {
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_UPDATED = 'ALERT_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;

  constructor() {
    super();
    this.connect();
  }

  private connect = () => {
    try {
      this.ws = new WebSocket(API_CONFIG.WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  };

  private handleReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectTimeout * this.reconnectAttempts);
    }
  };

  public sendMessage = (type: string, payload: any) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  };

  public disconnect = () => {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  };
}

export const websocketService = new WebSocketService();