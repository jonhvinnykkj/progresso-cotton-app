import type { Response } from "express";

// Store active SSE connections
const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
  console.log(`📡 New SSE client connected. Total clients: ${clients.size}`);

  // Remove client when connection closes or errors
  const cleanup = () => {
    clients.delete(res);
    console.log(`📡 SSE client disconnected. Total clients: ${clients.size}`);
  };

  res.on('close', cleanup);
  res.on('error', (error) => {
    console.error('❌ SSE client error:', error);
    cleanup();
  });
}

export function notifyClients(event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  console.log(`📢 Notifying ${clients.size} clients about: ${event}`, data);

  // Use Array.from to avoid issues with set modification during iteration
  const clientsArray = Array.from(clients);

  clientsArray.forEach((client) => {
    try {
      // Check if connection is still writable
      if (!client.writableEnded && !client.destroyed) {
        client.write(message);
      } else {
        // Remove dead connections
        clients.delete(client);
        console.log(`🧹 Removed dead SSE connection. Total clients: ${clients.size}`);
      }
    } catch (error) {
      console.error('❌ Error writing to client:', error);
      // Remove client on error
      clients.delete(client);
    }
  });
}

// Notify when bale is created, updated, or deleted
export function notifyBaleChange() {
  console.log('🔔 notifyBaleChange() called');
  notifyClients('bale-update', { timestamp: Date.now() });
}

// Notify about new version/deployment
export function notifyVersionUpdate(version: string) {
  console.log('🚀 notifyVersionUpdate() called with version:', version);
  notifyClients('version-update', { version, timestamp: Date.now() });
}
