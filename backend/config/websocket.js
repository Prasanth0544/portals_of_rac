// backend/config/websocket.js - CORRECTED
const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      ws.clientId = clientId;
      ws.subscribed = true; // Default: subscribed to updates
      this.clients.add(ws);

      console.log(`✅ WebSocket client connected: ${clientId} (${req.socket.remoteAddress})`);
      console.log(`   Total clients: ${this.clients.size}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'CONNECTION_SUCCESS',
        clientId: clientId,
        message: 'Connected to RAC Reallocation System',
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error(`Error parsing WebSocket message from ${clientId}:`, error);
          this.sendToClient(ws, {
            type: 'ERROR',
            message: 'Invalid message format'
          });
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        this.clients.delete(ws);
        console.log(`❌ WebSocket client disconnected: ${clientId} (Code: ${code}, Reason: ${reason})`);
        console.log(`   Total clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error.message);
        this.clients.delete(ws);
      });

      // Auto-ping every 30s to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('close', () => clearInterval(pingInterval));
    });

    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     ✅ WebSocket Server Initialized       ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    return this.wss;
  }

  /**
   * Handle client messages
   */
  handleClientMessage(ws, data) {
    console.log(`📨 Message from ${ws.clientId}: ${data.type}`);

    switch (data.type) {
      case 'PING':
        this.sendToClient(ws, {
          type: 'PONG',
          timestamp: new Date().toISOString()
        });
        break;

      case 'SUBSCRIBE':
        ws.subscribed = true;
        this.sendToClient(ws, {
          type: 'SUBSCRIBED',
          message: 'Successfully subscribed to updates'
        });
        break;

      case 'UNSUBSCRIBE':
        ws.subscribed = false;
        this.sendToClient(ws, {
          type: 'UNSUBSCRIBED',
          message: 'Successfully unsubscribed from updates'
        });
        break;

      default:
        this.sendToClient(ws, {
          type: 'UNKNOWN_MESSAGE',
          message: `Unknown message type: ${data.type}`
        });
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
      ws.send(message);
    }
  }

  /**
   * Broadcast to all connected clients (subscribed only)
   */
  broadcast(dataObj) {
    const message = JSON.stringify({
      ...dataObj,
      timestamp: new Date().toISOString()
    });
    let sentCount = 0;

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.subscribed !== false) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send to client ${client.clientId}:`, error);
        }
      }
    });

    console.log(`📡 Broadcast "${dataObj.type}" to ${sentCount}/${this.clients.size} clients`);
  }

  /**
   * Broadcast train update
   */
  broadcastTrainUpdate(eventType, data) {
    this.broadcast({
      type: 'TRAIN_UPDATE',
      eventType: eventType,
      data: data
    });
  }

  /**
   * Broadcast station arrival
   */
  broadcastStationArrival(stationData) {
    this.broadcast({
      type: 'STATION_ARRIVAL',
      data: stationData
    });
  }

  /**
   * Broadcast RAC reallocation
   */
  broadcastRACReallocation(reallocationData) {
    this.broadcast({
      type: 'RAC_REALLOCATION',
      data: reallocationData
    });
  }

  /**
   * Broadcast no-show event
   */
  broadcastNoShow(passengerData) {
    this.broadcast({
      type: 'NO_SHOW',
      data: passengerData
    });
  }

  /**
   * Broadcast statistics update
   */
  broadcastStatsUpdate(stats) {
    this.broadcast({
      type: 'STATS_UPDATE',
      data: { stats }
    });
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connected clients count
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  closeAll() {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
    console.log('🔌 All WebSocket connections closed');
  }
}

const wsManagerInstance = new WebSocketManager();
module.exports = wsManagerInstance;