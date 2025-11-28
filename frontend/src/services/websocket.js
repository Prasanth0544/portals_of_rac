// frontend/src/services/websocket.js

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {};
    this.connected = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(url = (process.env.REACT_APP_WS_URL || 'ws://localhost:5000')) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log(`🔌 Connecting to WebSocket: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');

      // Subscribe to updates
      this.send({
        type: 'SUBSCRIBE'
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data.type);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.connected = false;
      this.emit('disconnected');

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.reconnectTimeoutId = setTimeout(() => this.connect(url), this.reconnectDelay);
      } else {
        console.error('❌ Max reconnection attempts reached');
        this.emit('max_reconnect_reached');
        // Clear websocket reference
        this.ws = null;
      }
    };
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    switch (data.type) {
      case 'CONNECTION_SUCCESS':
        this.emit('connection_success', data);
        break;

      case 'TRAIN_UPDATE':
        this.emit('train_update', data);
        break;

      case 'STATION_ARRIVAL':
        this.emit('station_arrival', data);
        break;

      case 'RAC_REALLOCATION':
        this.emit('rac_reallocation', data);
        break;

      case 'NO_SHOW':
        this.emit('no_show', data);
        break;

      case 'STATS_UPDATE':
        this.emit('stats_update', data);
        break;

      case 'SUBSCRIBED':
        console.log('✅ Subscribed to updates');
        break;

      case 'PONG':
        // Keep-alive response
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send message to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Subscribe to event
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Unsubscribe from event
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send ping (keep-alive)
   */
  ping() {
    this.send({ type: 'PING' });
  }

  /**
   * Disconnect from WebSocket and cleanup
   */
  disconnect() {
    if (this.ws) {
      try {
        // Remove all event listeners
        if (this.ws.onopen) this.ws.removeEventListener('open', this.ws.onopen);
        if (this.ws.onmessage) this.ws.removeEventListener('message', this.ws.onmessage);
        if (this.ws.onclose) this.ws.removeEventListener('close', this.ws.onclose);
        if (this.ws.onerror) this.ws.removeEventListener('error', this.ws.onerror);

        // Send unsubscribe if connected
        if (this.ws.readyState === WebSocket.OPEN) {
          this.send({ type: 'UNSUBSCRIBE' });
          this.ws.close(1000, 'Client disconnect');
        }
      } catch (error) {
        console.error('Error during WebSocket disconnect:', error);
      } finally {
        // Clear references
        this.ws = null;
        this.connected = false;
        this.listeners = {};

        // Clear reconnect timeout
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = null;
        }
      }
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

const wsService = new WebSocketService();
export default wsService;