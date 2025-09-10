import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime, useSeatUpdates } from '@/hooks/useRealtime';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Clock, X } from 'lucide-react';

interface Seat {
  id: string;
  seat_number: string;
  row_number: number;
  column_position: number;
  price: number;
  status: 'available' | 'held' | 'sold';
  seat_type: string;
}

interface SeatHold {
  id: string;
  seat_id: string;
  user_id: string;
  expires_at: string;
}

interface SeatMapProps {
  tripId: string;
  onSeatSelect?: (seatIds: string[]) => void;
}

export const SeatMap = ({ tripId, onSeatSelect }: SeatMapProps) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatHolds, setSeatHolds] = useState<SeatHold[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Set up realtime subscriptions
  useRealtime(tripId);

  // Fetch seats and holds
  const fetchSeatsAndHolds = useCallback(async () => {
    try {
      const [seatsResponse, holdsResponse] = await Promise.all([
        supabase
          .from('seats')
          .select('*')
          .eq('trip_id', tripId)
          .order('row_number')
          .order('column_position'),
        supabase
          .from('seat_holds')
          .select('*')
          .gte('expires_at', new Date().toISOString())
      ]);

      if (seatsResponse.error) throw seatsResponse.error;
      if (holdsResponse.error) throw holdsResponse.error;

      setSeats(seatsResponse.data || []);
      setSeatHolds(holdsResponse.data || []);
    } catch (error) {
      console.error('Error fetching seats:', error);
      toast({
        title: "Error",
        description: "Failed to load seat map",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchSeatsAndHolds();
  }, [fetchSeatsAndHolds]);

  // Listen to realtime updates
  useSeatUpdates(useCallback((update: any) => {
    if (update.table === 'seats') {
      setSeats(prevSeats => {
        const newSeats = [...prevSeats];
        const seatIndex = newSeats.findIndex(s => s.id === update.new?.id || update.old?.id);
        
        if (update.eventType === 'DELETE' && seatIndex !== -1) {
          newSeats.splice(seatIndex, 1);
        } else if (update.eventType === 'INSERT') {
          newSeats.push(update.new);
        } else if (update.eventType === 'UPDATE' && seatIndex !== -1) {
          newSeats[seatIndex] = { ...newSeats[seatIndex], ...update.new };
        }
        
        return newSeats;
      });
    } else if (update.table === 'seat_holds') {
      setSeatHolds(prevHolds => {
        const newHolds = [...prevHolds];
        const holdIndex = newHolds.findIndex(h => h.id === update.new?.id || update.old?.id);
        
        if (update.eventType === 'DELETE' && holdIndex !== -1) {
          newHolds.splice(holdIndex, 1);
        } else if (update.eventType === 'INSERT') {
          newHolds.push(update.new);
        } else if (update.eventType === 'UPDATE' && holdIndex !== -1) {
          newHolds[holdIndex] = { ...newHolds[holdIndex], ...update.new };
        }
        
        return newHolds;
      });
    }
  }, []));

  const getSeatStatus = (seat: Seat) => {
    if (seat.status === 'sold') return 'sold';
    
    // Check if this seat is selected by current user
    if (selectedSeats.includes(seat.id)) return 'my-hold';
    
    const hold = seatHolds.find(h => h.seat_id === seat.id);
    if (hold) {
      const isExpired = new Date(hold.expires_at) <= new Date();
      if (!isExpired) {
        return hold.user_id === user?.id ? 'my-hold' : 'held';
      }
    }
    
    return seat.status;
  };

  const handleSeatClick = async (seat: Seat) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to select seats",
        variant: "destructive",
      });
      return;
    }

    const status = getSeatStatus(seat);
    
    if (status === 'sold' || status === 'held') {
      return; // Can't select sold or held seats
    }

    if (status === 'my-hold') {
      // Release hold
      try {
        const { error } = await supabase
          .from('seat_holds')
          .delete()
          .eq('seat_id', seat.id)
          .eq('user_id', user.id);

        if (error) throw error;

        await supabase
          .from('seats')
          .update({ status: 'available' })
          .eq('id', seat.id);

        // Update local state immediately for visual feedback
        setSeats(prevSeats => 
          prevSeats.map(s => 
            s.id === seat.id ? { ...s, status: 'available' as const } : s
          )
        );

        const newSelectedSeats = selectedSeats.filter(id => id !== seat.id);
        setSelectedSeats(newSelectedSeats);
        onSeatSelect?.(newSelectedSeats);
        toast({
          title: "Seat released",
          description: `Seat ${seat.seat_number} has been released`,
        });
      } catch (error) {
        console.error('Error releasing seat:', error);
        toast({
          title: "Error",
          description: "Failed to release seat",
          variant: "destructive",
        });
      }
      return;
    }

    // Hold seat
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute hold

      const { error: holdError } = await supabase
        .from('seat_holds')
        .insert({
          seat_id: seat.id,
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (holdError) throw holdError;

      const { error: seatError } = await supabase
        .from('seats')
        .update({ status: 'held' })
        .eq('id', seat.id);

      if (seatError) throw seatError;

      // Update local state immediately for visual feedback
      setSeats(prevSeats => 
        prevSeats.map(s => 
          s.id === seat.id ? { ...s, status: 'held' as const } : s
        )
      );

      const newSelectedSeats = [...selectedSeats, seat.id];
      setSelectedSeats(newSelectedSeats);
      onSeatSelect?.(newSelectedSeats);

      toast({
        title: "Seat held",
        description: `Seat ${seat.seat_number} is held for 5 minutes`,
      });
    } catch (error) {
      console.error('Error holding seat:', error);
      toast({
        title: "Error",
        description: "Failed to hold seat. It may have been taken by another user.",
        variant: "destructive",
      });
    }
  };

  const getSeatColor = (seat: Seat) => {
    const status = getSeatStatus(seat);
    
    switch (status) {
      case 'sold':
        return 'bg-seat-sold hover:bg-seat-sold text-seat-sold-foreground cursor-not-allowed transition-all duration-200';
      case 'held':
        return 'bg-seat-held hover:bg-seat-held text-seat-held-foreground cursor-not-allowed transition-all duration-200';
      case 'my-hold':
        return 'bg-seat-selected hover:bg-seat-selected/90 text-seat-selected-foreground cursor-pointer transition-all duration-200 shadow-lg transform scale-105';
      default:
        return 'bg-seat-available hover:bg-seat-available/90 text-seat-available-foreground cursor-pointer transition-all duration-200 hover:shadow-md hover:transform hover:scale-105';
    }
  };

  const getSeatIcon = (seat: Seat) => {
    const status = getSeatStatus(seat);
    
    switch (status) {
      case 'sold':
        return <X className="h-3 w-3" />;
      case 'held':
        return <Clock className="h-3 w-3" />;
      case 'my-hold':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row_number]) acc[seat.row_number] = [];
    acc[seat.row_number].push(seat);
    return acc;
  }, {} as Record<number, Seat[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Your Seats</CardTitle>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-available rounded shadow-sm"></div>
            <span className="font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-selected rounded shadow-sm"></div>
            <span className="font-medium">Your Selection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-held rounded shadow-sm"></div>
            <span className="font-medium">Held by Others</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-seat-sold rounded shadow-sm"></div>
            <span className="font-medium">Sold</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Driver area */}
          <div className="text-center mb-4">
            <div className="bg-muted rounded-lg p-2 inline-block">
              <span className="text-sm font-medium">Driver</span>
            </div>
          </div>
          
          {/* Seat rows */}
          {Object.entries(seatsByRow)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([rowNumber, rowSeats]) => (
              <div key={rowNumber} className="flex items-center gap-2">
                <Badge variant="outline" className="min-w-[2rem] justify-center">
                  {rowNumber}
                </Badge>
                <div className="flex gap-1 flex-1 justify-center">
                  {rowSeats
                    .sort((a, b) => a.column_position - b.column_position)
                    .map((seat, index) => (
                      <div key={seat.id} className="flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-10 h-10 p-1 ${getSeatColor(seat)}`}
                          onClick={() => handleSeatClick(seat)}
                          title={`Seat ${seat.seat_number} - ₹${seat.price}`}
                        >
                          <div className="flex flex-col items-center text-xs">
                            {getSeatIcon(seat)}
                            <span>{seat.seat_number}</span>
                          </div>
                        </Button>
                        {/* Add aisle space after certain columns */}
                        {index === 1 && (
                          <div className="w-4"></div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};