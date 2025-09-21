import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'seat_update' | 'seat_hold' | 'seat_release' | 'booking_update' | 'passenger_list_update';
  tripId?: string;
  seatId?: string;
  bookingId?: string;
  organizerId?: string;
  data?: any;
}

interface UseWebSocketProps {
  tripId?: string;
  organizerId?: string;
  onSeatUpdate?: (data: any) => void;
  onBookingUpdate?: (data: any) => void;
  onPassengerListUpdate?: (data: any) => void;
}

export const useWebSocket = ({
  tripId,
  organizerId,
  onSeatUpdate,
  onBookingUpdate,
  onPassengerListUpdate,
}: UseWebSocketProps) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const connect = () => {
      try {
        // Use the project URL directly since VITE env vars aren't supported
        const wsUrl = `wss://gimawoskyipbsanqolkc.functions.supabase.co/realtime-websocket`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
          console.log('WebSocket connected');

          // Join trip room if tripId is provided
          if (tripId) {
            ws.current?.send(JSON.stringify({
              type: 'join_trip',
              tripId,
            }));
          }

          // Join organizer room if organizerId is provided
          if (organizerId) {
            ws.current?.send(JSON.stringify({
              type: 'join_organizer',
              organizerId,
            }));
          }
        };

        ws.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            switch (message.type) {
              case 'seat_update':
              case 'seat_hold':
              case 'seat_release':
                onSeatUpdate?.(message.data);
                break;
              case 'booking_update':
                onBookingUpdate?.(message.data);
                break;
              case 'passenger_list_update':
                onPassengerListUpdate?.(message.data);
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.current.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
          
          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection failed');
          setIsConnected(false);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setConnectionError('Failed to connect');
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [tripId, organizerId]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  return {
    isConnected,
    connectionError,
    sendMessage,
  };
};