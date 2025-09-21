import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Passenger {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone?: string;
  seat_numbers: string[];
  total_amount: number;
  payment_status: string;
  created_at: string;
}

interface PassengerListProps {
  tripId: string;
  organizerId: string;
}

export const PassengerList = ({ tripId, organizerId }: PassengerListProps) => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // WebSocket for real-time passenger updates
  const { isConnected } = useWebSocket({
    organizerId,
    onPassengerListUpdate: (data) => {
      console.log('Real-time passenger update:', data);
      if (data.newBooking) {
        // Add new booking to the list
        const newPassenger: Passenger = {
          id: crypto.randomUUID(),
          booking_reference: data.newBooking.bookingReference,
          passenger_name: data.newBooking.passengerName,
          passenger_email: data.newBooking.passengerEmail,
          seat_numbers: data.newBooking.seatNumbers,
          total_amount: data.newBooking.totalAmount,
          payment_status: 'completed',
          created_at: new Date().toISOString(),
        };
        
        setPassengers(prev => [newPassenger, ...prev]);
        setTotalRevenue(prev => prev + data.newBooking.totalAmount);
        
        toast({
          title: "New Booking!",
          description: `${data.newBooking.passengerName} just booked seats ${data.newBooking.seatNumbers.join(', ')}`,
        });
      }
      
      // Refresh the complete list to stay in sync
      fetchPassengers();
    },
  });

  const fetchPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', tripId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPassengers(data || []);
      
      // Calculate total revenue
      const revenue = (data || []).reduce((sum, booking) => sum + booking.total_amount, 0);
      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching passengers:', error);
      toast({
        title: "Error",
        description: "Failed to load passenger list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [tripId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Passenger List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Passenger List
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Live Updates
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Passengers</div>
            <div className="text-2xl font-bold">{passengers.length}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-800">Total Revenue</span>
            <span className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {passengers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No passengers booked yet</p>
            <p className="text-sm">Bookings will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {passengers.map((passenger) => (
              <div
                key={passenger.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{passenger.passenger_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Booking: {passenger.booking_reference}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{passenger.total_amount.toFixed(2)}</div>
                    <Badge 
                      variant={passenger.payment_status === 'completed' ? 'default' : 'secondary'}
                    >
                      {passenger.payment_status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{passenger.passenger_email}</span>
                  </div>
                  
                  {passenger.passenger_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{passenger.passenger_phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Seats: {passenger.seat_numbers.join(', ')}</span>
                  </div>
                  
                  <div className="text-muted-foreground">
                    Booked: {new Date(passenger.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};