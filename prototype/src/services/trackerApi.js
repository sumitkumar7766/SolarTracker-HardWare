// WebSocket service connecting the frontend to FastAPI backend (/ws)
const BACKEND_WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws';
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

class TrackerWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.isConnected = false;
    this.status = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('CONNECTING');
    try {
      this.ws = new WebSocket(BACKEND_WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.setStatus('CONNECTED');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch {
          // ignore malformed packets
        }
      };

      this.ws.onerror = () => {
        this.setStatus('DISCONNECTED');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.setStatus('RECONNECTING');
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch {}
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch {}
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.setStatus('DISCONNECTED');
  }

  // REST API helpers
  async startTracking() {
    return fetch(`${BACKEND_API_URL}/api/tracker/start`, { method: 'POST' });
  }

  async stopTracking() {
    return fetch(`${BACKEND_API_URL}/api/tracker/stop`, { method: 'POST' });
  }

  async setMode(mode) {
    return fetch(`${BACKEND_API_URL}/api/tracker/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  }

  async emergencyStop() {
    return fetch(`${BACKEND_API_URL}/api/motors/stop`, { method: 'POST' });
  }

  async jogAzimuth(direction) {
    const endpoint = direction > 0 ? 'right' : direction < 0 ? 'left' : 'stop';
    return fetch(`${BACKEND_API_URL}/api/motors/azimuth/${endpoint}`, { method: 'POST' });
  }

  async jogElevation(direction) {
    const endpoint = direction > 0 ? 'up' : direction < 0 ? 'down' : 'stop';
    return fetch(`${BACKEND_API_URL}/api/motors/elevation/${endpoint}`, { method: 'POST' });
  }
}

export const trackerWS = new TrackerWebSocketService();
