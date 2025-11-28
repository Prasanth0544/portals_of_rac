// backend/config/websocket.js - Enhanced with Real-time Offer Push
const WebSocket = require("ws");

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.pnrSubscriptions = new Map(); // PNR -> Set of WebSocket clients
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", (ws, req) => {
      const clientId = this.generateClientId();
      ws.clientId = clientId;
      ws.subscribed = true;
      ws.subscribedPNRs = new Set(); // Track which PNRs this client is subscribed to
      this.clients.add(ws);

      console.log(
        `✅ WebSocket client connected: ${clientId} (${req.socket.remoteAddress})`,
      );
      console.log(`   Total clients: ${this.clients.size}`);

      // Send welcome message
      this.sendToClient(ws, {
        type: "CONNECTION_SUCCESS",
        clientId: clientId,
        message: "Connected to RAC Reallocation System",
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error(
            `Error parsing WebSocket message from ${clientId}:`,
            error,
          );
          this.sendToClient(ws, {
            type: "ERROR",
            message: "Invalid message format",
          });
        }
      });

      // Handle client disconnect
      ws.on("close", (code, reason) => {
        this.handleClientDisconnect(ws);
        console.log(
          `❌ WebSocket client disconnected: ${clientId} (Code: ${code})`,
        );
        console.log(`   Total clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error.message);
        this.handleClientDisconnect(ws);
      });

      // Heartbeat - ping every 30s
      ws.isAlive = true;
      const pongHandler = () => {
        ws.isAlive = true;
      };
      ws.on("pong", pongHandler);

      const pingInterval = setInterval(() => {
        if (!ws.isAlive) {
          clearInterval(pingInterval);
          try {
            ws.terminate();
          } catch (err) {
            console.error('Error terminating dead connection:', err);
          }
          return;
        }
        ws.isAlive = false;
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.ping();
          } catch (err) {
            console.error('Error sending ping:', err);
          }
        }
      }, 30000);

      // Store interval reference for cleanup
      ws.pingInterval = pingInterval;
      ws.pongHandler = pongHandler;

      ws.on("close", () => {
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
          ws.pingInterval = null;
        }
      });
    });

    console.log("");
    console.log("╔════════════════════════════════════════════╗");
    console.log("║   ✅ WebSocket Server Initialized         ║");
    console.log("║   📡 Real-time Offer Push: ENABLED        ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("");

    return this.wss;
  }

  /**
   * Handle client messages
   */
  handleClientMessage(ws, data) {
    const { type, payload } = data;
    console.log(`📨 Message from ${ws.clientId}: ${type}`);

    switch (type) {
      case "ping":
      case "PING":
        this.sendToClient(ws, { type: "pong" });
        break;

      case "subscribe:offers":
        // Subscribe to offers for a specific PNR
        if (payload && payload.pnr) {
          this.subscribeToPNR(ws, payload.pnr);
        }
        break;

      case "unsubscribe:offers":
        // Unsubscribe from offers for a specific PNR
        if (payload && payload.pnr) {
          this.unsubscribeFromPNR(ws, payload.pnr);
        }
        break;

      case "SUBSCRIBE":
        ws.subscribed = true;
        this.sendToClient(ws, {
          type: "SUBSCRIBED",
          message: "Successfully subscribed to updates",
        });
        break;

      case "UNSUBSCRIBE":
        ws.subscribed = false;
        this.sendToClient(ws, {
          type: "UNSUBSCRIBED",
          message: "Successfully unsubscribed from updates",
        });
        break;

      default:
        console.log(`⚠️ Unknown message type: ${type}`);
    }
  }

  /**
   * Subscribe a client to PNR-specific updates
   */
  subscribeToPNR(ws, pnr) {
    // Add to client's subscribed PNRs
    ws.subscribedPNRs.add(pnr);

    // Add to global PNR subscriptions map
    if (!this.pnrSubscriptions.has(pnr)) {
      this.pnrSubscriptions.set(pnr, new Set());
    }
    this.pnrSubscriptions.get(pnr).add(ws);

    console.log(`✅ Client ${ws.clientId} subscribed to PNR: ${pnr}`);
    console.log(
      `   Total subscriptions for ${pnr}: ${this.pnrSubscriptions.get(pnr).size}`,
    );

    // Send confirmation
    this.sendToClient(ws, {
      type: "subscribed",
      payload: { pnr, message: `Subscribed to offers for PNR ${pnr}` },
    });
  }

  /**
   * Unsubscribe a client from PNR-specific updates
   */
  unsubscribeFromPNR(ws, pnr) {
    ws.subscribedPNRs.delete(pnr);

    const subscribers = this.pnrSubscriptions.get(pnr);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.pnrSubscriptions.delete(pnr);
      }
    }

    console.log(`❌ Client ${ws.clientId} unsubscribed from PNR: ${pnr}`);

    this.sendToClient(ws, {
      type: "unsubscribed",
      payload: { pnr, message: `Unsubscribed from offers for PNR ${pnr}` },
    });
  }

  /**
   * Handle client disconnect - cleanup subscriptions and prevent memory leaks
   */
  handleClientDisconnect(ws) {
    // Remove from all PNR subscriptions FIRST
    ws.subscribedPNRs.forEach((pnr) => {
      const subscribers = this.pnrSubscriptions.get(pnr);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.pnrSubscriptions.delete(pnr);
        }
      }
    });

    // Clear the subscribed PNRs set
    ws.subscribedPNRs.clear();

    // Remove from all clients
    this.clients.delete(ws);

    // Remove event listeners to prevent memory leaks
    ws.removeAllListeners('message');
    ws.removeAllListeners('close');
    ws.removeAllListeners('error');
    ws.removeAllListeners('pong');

    // Terminate the connection
    try {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.terminate();
      }
    } catch (err) {
      console.error('Error terminating WebSocket:', err);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({
          ...data,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        ws.send(message);
        return true;
      } catch (error) {
        console.error(`Failed to send to client ${ws.clientId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * Send upgrade offer to specific PNR (REAL-TIME PUSH)
   */
  sendOfferToPassenger(pnr, offer) {
    const subscribers = this.pnrSubscriptions.get(pnr);

    if (!subscribers || subscribers.size === 0) {
      console.log(`⚠️ No active subscribers for PNR: ${pnr}`);
      return false;
    }

    let sentCount = 0;
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const sent = this.sendToClient(ws, {
          type: "upgrade:offer",
          payload: offer,
        });
        if (sent) sentCount++;
      }
    });

    console.log(`✅ Sent offer to PNR ${pnr}: ${sentCount} client(s) notified`);
    console.log(
      `   Offer: ${offer.fromBerth || "RAC"} → ${offer.toBerth} (${offer.coach})`,
    );

    return sentCount > 0;
  }

  /**
   * Notify offer expired
   */
  notifyOfferExpired(pnr, notificationId) {
    const subscribers = this.pnrSubscriptions.get(pnr);
    if (!subscribers) return false;

    let sentCount = 0;
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const sent = this.sendToClient(ws, {
          type: "upgrade:expired",
          payload: { notificationId, pnr },
        });
        if (sent) sentCount++;
      }
    });

    console.log(
      `⏰ Notified ${sentCount} client(s) - Offer expired for PNR ${pnr}`,
    );
    return sentCount > 0;
  }

  /**
   * Notify upgrade confirmed by TTE
   */
  notifyUpgradeConfirmed(pnr, upgradeData) {
    const subscribers = this.pnrSubscriptions.get(pnr);
    if (!subscribers) return false;

    let sentCount = 0;
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const sent = this.sendToClient(ws, {
          type: "upgrade:confirmed",
          payload: { pnr, ...upgradeData },
        });
        if (sent) sentCount++;
      }
    });

    console.log(
      `✅ Notified ${sentCount} client(s) - Upgrade confirmed for PNR ${pnr}`,
    );
    return sentCount > 0;
  }

  /**
   * Notify upgrade rejected by TTE
   */
  notifyUpgradeRejected(pnr, reason) {
    const subscribers = this.pnrSubscriptions.get(pnr);
    if (!subscribers) return false;

    let sentCount = 0;
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const sent = this.sendToClient(ws, {
          type: "upgrade:rejected",
          payload: { pnr, reason },
        });
        if (sent) sentCount++;
      }
    });

    console.log(
      `❌ Notified ${sentCount} client(s) - Upgrade rejected for PNR ${pnr}`,
    );
    return sentCount > 0;
  }

  /**
   * Notify boarding status change
   */
  notifyBoardingStatus(pnr, status) {
    const subscribers = this.pnrSubscriptions.get(pnr);
    if (!subscribers) return false;

    let sentCount = 0;
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const sent = this.sendToClient(ws, {
          type: "passenger:boarding_status",
          payload: { pnr, boarded: status },
        });
        if (sent) sentCount++;
      }
    });

    console.log(
      `📍 Notified ${sentCount} client(s) - Boarding status for PNR ${pnr}: ${status}`,
    );
    return sentCount > 0;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(dataObj) {
    const message = JSON.stringify({
      ...dataObj,
      timestamp: new Date().toISOString(),
    });
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.subscribed !== false) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send to client ${client.clientId}:`, error);
        }
      }
    });

    console.log(
      `📡 Broadcast "${dataObj.type}" to ${sentCount}/${this.clients.size} clients`,
    );
    return sentCount;
  }

  /**
   * Broadcast train update
   */
  broadcastTrainUpdate(eventType, data) {
    return this.broadcast({
      type: "TRAIN_UPDATE",
      eventType: eventType,
      data: data,
    });
  }

  /**
   * Broadcast station arrival
   */
  broadcastStationArrival(stationData) {
    return this.broadcast({
      type: "STATION_ARRIVAL",
      data: stationData,
    });
  }

  /**
   * Broadcast RAC reallocation
   */
  broadcastRACReallocation(reallocationData) {
    return this.broadcast({
      type: "RAC_REALLOCATION",
      data: reallocationData,
    });
  }

  /**
   * Broadcast no-show event
   */
  broadcastNoShow(passengerData) {
    return this.broadcast({
      type: "NO_SHOW",
      data: passengerData,
    });
  }

  /**
   * Broadcast statistics update
   */
  broadcastStatsUpdate(stats) {
    return this.broadcast({
      type: "STATS_UPDATE",
      data: { stats },
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
   * Get subscription stats
   */
  getSubscriptionStats() {
    return {
      totalClients: this.clients.size,
      totalPNRSubscriptions: this.pnrSubscriptions.size,
      subscriptionDetails: Array.from(this.pnrSubscriptions.entries()).map(
        ([pnr, clients]) => ({
          pnr,
          subscribers: clients.size,
        }),
      ),
    };
  }

  /**
   * Close all connections and cleanup memory
   */
  closeAll() {
    // Close and cleanup each client
    this.clients.forEach((client) => {
      try {
        // Remove all event listeners
        client.removeAllListeners('message');
        client.removeAllListeners('close');
        client.removeAllListeners('error');
        client.removeAllListeners('pong');

        // Clear subscriptions
        client.subscribedPNRs.clear();

        // Clear ping interval
        if (client.pingInterval) {
          clearInterval(client.pingInterval);
          client.pingInterval = null;
        }

        // Close connection
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, 'Server shutdown');
        }
      } catch (err) {
        console.error('Error closing client:', err);
      }
    });

    // Clear all collections
    this.clients.clear();
    this.pnrSubscriptions.clear();

    // Close server
    if (this.wss) {
      try {
        this.wss.close();
      } catch (err) {
        console.error('Error closing WebSocket server:', err);
      }
      this.wss = null;
    }

    console.log('🔌 All WebSocket connections closed and memory cleared');
  }
}

// Export singleton instance
const wsManagerInstance = new WebSocketManager();
module.exports = wsManagerInstance;
