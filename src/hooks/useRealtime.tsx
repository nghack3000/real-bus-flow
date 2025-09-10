import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SeatUpdate {
  id: string;
  status: 'available' | 'held' | 'sold';
  trip_id: string;
  seat_number: string;
}

export interface SeatHoldUpdate {
  id: string;
  seat_id: string;
  user_id: string;
  expires_at: string;
}

export const useRealtime = (tripId: string | undefined) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const realtimeChannel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Seat update:', payload);
          // Dispatch custom event for seat updates
          window.dispatchEvent(new CustomEvent('seatUpdate', {
            detail: payload
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_holds',
        },
        (payload) => {
          console.log('Seat hold update:', payload);
          // Dispatch custom event for hold updates
          window.dispatchEvent(new CustomEvent('seatHoldUpdate', {
            detail: payload
          }));
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [tripId]);

  return { channel };
};

// Hook for listening to seat updates
export const useSeatUpdates = (callback: (update: any) => void) => {
  useEffect(() => {
    const handleSeatUpdate = (event: CustomEvent) => {
      callback(event.detail);
    };

    const handleSeatHoldUpdate = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('seatUpdate', handleSeatUpdate as EventListener);
    window.addEventListener('seatHoldUpdate', handleSeatHoldUpdate as EventListener);

    return () => {
      window.removeEventListener('seatUpdate', handleSeatUpdate as EventListener);
      window.removeEventListener('seatHoldUpdate', handleSeatHoldUpdate as EventListener);
    };
  }, [callback]);
};