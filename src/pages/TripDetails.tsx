import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { SeatMap } from '@/components/SeatMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { MapPin, Clock, Bus, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  route_from: string;
  route_to: string;
  departure_time: string;
  arrival_time: string;
  bus_type: string;
  base_price: number;
  total_seats: number;
}

interface Seat {
  id: string;
  seat_number: string;
  price: number;
}

const TripDetails = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      try {
        const { data, error } = await supabase
          .from('bus_trips')
          .select('*')
          .eq('id', tripId)
          .single();

        if (error) throw error;
        setTrip(data);
      } catch (error) {
        console.error('Error fetching trip:', error);
        toast({
          title: "Error",
          description: "Failed to load trip details",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, navigate]);

  useEffect(() => {
    // Fetch selected seat details when selectedSeatIds changes
    const fetchSelectedSeats = async () => {
      if (selectedSeatIds.length === 0) {
        setSelectedSeats([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('seats')
          .select('id, seat_number, price')
          .in('id', selectedSeatIds);

        if (error) throw error;
        setSelectedSeats(data || []);
      } catch (error) {
        console.error('Error fetching selected seats:', error);
      }
    };

    fetchSelectedSeats();
  }, [selectedSeatIds]);

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to complete booking",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (selectedSeatIds.length === 0) {
      toast({
        title: "No seats selected",
        description: "Please select at least one seat",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);

    try {
      // Verify all selected seats are still held by the user
      const { data: holds, error: holdError } = await supabase
        .from('seat_holds')
        .select('seat_id')
        .in('seat_id', selectedSeatIds)
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString());

      if (holdError) throw holdError;

      if (holds.length !== selectedSeatIds.length) {
        toast({
          title: "Seat hold expired",
          description: "Some seats are no longer held. Please reselect your seats.",
          variant: "destructive",
        });
        setSelectedSeatIds([]);
        return;
      }

      // Generate booking reference
      const bookingReference = `BT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('user_id', user.id)
        .single();

      const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          trip_id: tripId!,
          user_id: user.id,
          passenger_name: profile?.full_name || user.user_metadata?.full_name || '',
          passenger_email: profile?.email || user.email || '',
          passenger_phone: profile?.phone || '',
          seat_numbers: selectedSeats.map(s => s.seat_number),
          total_amount: totalAmount,
          booking_reference: bookingReference,
          payment_status: 'completed', // Simplified - would integrate with payment gateway
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create booking-seat relationships
      const bookingSeatData = selectedSeatIds.map(seatId => ({
        booking_id: booking.id,
        seat_id: seatId,
      }));

      const { error: bookingSeatError } = await supabase
        .from('booking_seats')
        .insert(bookingSeatData);

      if (bookingSeatError) throw bookingSeatError;

      // Update seats to sold status
      const { error: seatUpdateError } = await supabase
        .from('seats')
        .update({ status: 'sold' })
        .in('id', selectedSeatIds);

      if (seatUpdateError) throw seatUpdateError;

      // Delete holds
      const { error: holdDeleteError } = await supabase
        .from('seat_holds')
        .delete()
        .in('seat_id', selectedSeatIds)
        .eq('user_id', user.id);

      if (holdDeleteError) throw holdDeleteError;

      toast({
        title: "Booking confirmed!",
        description: `Your booking reference is ${bookingReference}`,
      });

      // Send confirmation emails
      try {
        const { data: tripData } = await supabase
          .from('bus_trips')
          .select('*')
          .eq('id', tripId!)
          .single();

        if (tripData) {
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              bookingReference,
              passengerName: profile?.full_name || user.user_metadata?.full_name || '',
              passengerEmail: profile?.email || user.email || '',
              tripDetails: {
                routeFrom: tripData.route_from,
                routeTo: tripData.route_to,
                departureTime: tripData.departure_time,
                arrivalTime: tripData.arrival_time,
                busType: tripData.bus_type,
              },
              seatNumbers: selectedSeats.map(s => s.seat_number),
              totalAmount,
            },
          });
        }
      } catch (emailError) {
        console.error('Failed to send confirmation emails:', emailError);
        // Don't block the booking process if email fails
      }

      navigate('/bookings');
    } catch (error) {
      console.error('Error completing booking:', error);
      toast({
        title: "Booking failed",
        description: "There was an error completing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trip not found</h1>
          <Button onClick={() => navigate('/')}>Browse Trips</Button>
        </div>
      </Layout>
    );
  }

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  return (
    <Layout>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trip Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{trip.route_from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{trip.route_to}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {format(new Date(trip.departure_time), 'MMM dd, yyyy')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(trip.departure_time), 'h:mm a')} - {format(new Date(trip.arrival_time), 'h:mm a')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">{trip.bus_type}</Badge>
                <Badge variant="outline">{trip.total_seats} seats</Badge>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Base Price</h4>
                <span className="text-2xl font-bold">₹{trip.base_price}</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected Seats Summary */}
          {selectedSeats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Seats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedSeats.map((seat) => (
                  <div key={seat.id} className="flex justify-between items-center">
                    <span>Seat {seat.seat_number}</span>
                    <span className="font-medium">₹{seat.price}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCheckout}
                  disabled={bookingLoading}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {bookingLoading ? 'Processing...' : 'Complete Booking'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Seat Map */}
        <div className="lg:col-span-2">
          <SeatMap 
            tripId={tripId!} 
            onSeatSelect={setSelectedSeatIds}
          />
        </div>
      </div>
    </Layout>
  );
};

export default TripDetails;