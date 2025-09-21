import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectedClient {
  socket: WebSocket;
  userId?: string;
  tripRooms: Set<string>;
  organizerRooms: Set<string>;
}

const clients = new Map<string, ConnectedClient>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = crypto.randomUUID();
  
  const client: ConnectedClient = {
    socket,
    tripRooms: new Set(),
    organizerRooms: new Set(),
  };
  
  clients.set(clientId, client);

  socket.onopen = () => {
    console.log(`Client ${clientId} connected`);
    socket.send(JSON.stringify({
      type: 'connection_established',
      clientId,
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`Received message from ${clientId}:`, message);

      switch (message.type) {
        case 'join_trip':
          client.tripRooms.add(message.tripId);
          console.log(`Client ${clientId} joined trip room: ${message.tripId}`);
          break;

        case 'leave_trip':
          client.tripRooms.delete(message.tripId);
          console.log(`Client ${clientId} left trip room: ${message.tripId}`);
          break;

        case 'join_organizer':
          client.organizerRooms.add(message.organizerId);
          console.log(`Client ${clientId} joined organizer room: ${message.organizerId}`);
          break;

        case 'seat_hold':
        case 'seat_release':
        case 'seat_update':
          // Broadcast to all clients in the trip room
          broadcastToTripRoom(message.tripId, {
            type: message.type,
            tripId: message.tripId,
            seatId: message.seatId,
            data: message.data,
          }, clientId);
          break;

        case 'booking_update':
          // Broadcast booking updates to trip room
          broadcastToTripRoom(message.tripId, {
            type: 'booking_update',
            tripId: message.tripId,
            data: message.data,
          }, clientId);
          break;

        case 'passenger_list_update':
          // Broadcast to organizer room
          broadcastToOrganizerRoom(message.organizerId, {
            type: 'passenger_list_update',
            tripId: message.tripId,
            data: message.data,
          }, clientId);
          break;
      }
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
    }
  };

  socket.onclose = () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  };

  socket.onerror = (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  };

  return response;
});

function broadcastToTripRoom(tripId: string, message: any, excludeClientId?: string) {
  clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.tripRooms.has(tripId)) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        clients.delete(clientId);
      }
    }
  });
}

function broadcastToOrganizerRoom(organizerId: string, message: any, excludeClientId?: string) {
  clients.forEach((client, clientId) => {
    if (clientId !== excludeClientId && client.organizerRooms.has(organizerId)) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        clients.delete(clientId);
      }
    }
  });
}