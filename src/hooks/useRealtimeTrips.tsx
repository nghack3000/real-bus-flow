import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TripUpdate {
  id: string;
  route_from: string;
  route_to: string;
  departure_time: string;
  arrival_time: string;
  bus_type: string;
  total_seats: number;
  base_price: number;
  created_at: string;
}

export const useRealtimeTrips = () => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel('bus-trips-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_trips',
        },
        (payload) => {
          console.log('Trip update:', payload);
          // Dispatch custom event for trip updates
          window.dispatchEvent(new CustomEvent('tripUpdate', {
            detail: payload
          }));
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, []);

  return { channel };
};

// Hook for listening to trip updates
export const useTripUpdates = (callback: (update: any) => void) => {
  useEffect(() => {
    const handleTripUpdate = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('tripUpdate', handleTripUpdate as EventListener);

    return () => {
      window.removeEventListener('tripUpdate', handleTripUpdate as EventListener);
    };
  }, [callback]);
};