/**
 * WebSocket service for real-time property updates
 */

import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";

export type WebSocketEventType = 
  | 'property.updated'
  | 'property.phase.changed'
  | 'checklist.updated'
  | 'connection.status';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
}

export interface PropertyUpdatePayload {
  property: Property;
  changes: Partial<Property>;
}

export interface PropertyPhaseChangePayload {
  propertyId: string;
  oldPhase: RenoKanbanPhase;
  newPhase: RenoKanbanPhase;
}

export interface ChecklistUpdatePayload {
  propertyId: string;
  checklistType: string;
  sectionId?: string;
}

type EventCallback = (payload: any) => void;

/**
 * WebSocket service for real-time updates
 */
export class PropertyWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<WebSocketEventType, EventCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;
  private url: string;

  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connection.status', { connected: true });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('connection.status', { connected: false, error });
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.emit('connection.status', { connected: false });
          
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: WebSocketEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribe from an event
   */
  off(event: WebSocketEventType, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Send a message to the server
   */
  send(type: string, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { type, payload });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const callbacks = this.listeners.get(message.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(message.payload);
      } catch (error) {
        console.error(`Error in WebSocket callback for ${message.type}:`, error);
      }
    });
  }

  /**
   * Emit event to local listeners (for connection status, etc.)
   */
  private emit(event: WebSocketEventType, payload: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error emitting ${event}:`, error);
      }
    });
  }
}

// Export singleton instance
let wsInstance: PropertyWebSocket | null = null;

export function getWebSocket(): PropertyWebSocket {
  if (!wsInstance) {
    wsInstance = new PropertyWebSocket();
  }
  return wsInstance;
}

