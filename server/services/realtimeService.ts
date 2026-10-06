import { Response } from "express";

const clients: Set<Response> = new Set();

export function addRealtimeClient(res: Response) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function broadcastRealtimeUpdate(payload: { type: string; [key: string]: any }) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch (err) {
      clients.delete(client);
    }
  }
}
