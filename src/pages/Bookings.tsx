import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TicketDownload } from '@/components/TicketDownload';
import { BookingCancellation } from '@/components/BookingCancellation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MapPin, Clock, CreditCard, Ticket } from 'lucide-react';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_email: string;
  seat_numbers: string[];
  total_amount: number;
  payment_status: string;
  created_at: string;
  bus_trips: {
    route_from: string;
    route_to: string;
    departure_time: string;
    arrival_time: string;
    bus_type: string;
  };
}

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          bus_trips (
            route_from,
            route_to,
            departure_time,
            arrival_time,
            bus_type
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load your bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View and manage your bus ticket bookings</p>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">
                Browse and book your first bus trip
              </p>
              <Button onClick={() => navigate('/')}>
                Browse Trips
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {booking.bus_trips.route_from} → {booking.bus_trips.route_to}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Booking Reference: {booking.booking_reference}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {booking.payment_status}
                      </Badge>
                      <Badge variant="outline">{booking.bus_trips.bus_type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.bus_trips.route_from} to {booking.bus_trips.route_to}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{format(new Date(booking.bus_trips.departure_time), 'MMM dd, yyyy')}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(booking.bus_trips.departure_time), 'h:mm a')} - {format(new Date(booking.bus_trips.arrival_time), 'h:mm a')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span>Seats: {booking.seat_numbers.join(', ')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">₹{booking.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>Passenger:</strong> {booking.passenger_name}<br />
                      <strong>Email:</strong> {booking.passenger_email}<br />
                      <strong>Booked:</strong> {format(new Date(booking.created_at), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>

                  {new Date(booking.bus_trips.departure_time) > new Date() && booking.payment_status !== 'cancelled' && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <TicketDownload 
                        bookingReference={booking.booking_reference}
                        tripDetails={{
                          routeFrom: booking.bus_trips.route_from,
                          routeTo: booking.bus_trips.route_to,
                          departureTime: booking.bus_trips.departure_time,
                          arrivalTime: booking.bus_trips.arrival_time,
                          busType: booking.bus_trips.bus_type,
                        }}
                        passengerName={booking.passenger_name}
                        seatNumbers={booking.seat_numbers}
                        totalAmount={booking.total_amount}
                      />
                      <BookingCancellation
                        bookingId={booking.id}
                        bookingReference={booking.booking_reference}
                        departureTime={booking.bus_trips.departure_time}
                        totalAmount={booking.total_amount}
                        passengerName={booking.passenger_name}
                        passengerEmail={booking.passenger_email}
                        tripDetails={{
                          routeFrom: booking.bus_trips.route_from,
                          routeTo: booking.bus_trips.route_to,
                        }}
                        onCancellationSuccess={fetchBookings}
                      />
                    </div>
                  )}

                  {booking.payment_status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <Ticket className="h-4 w-4" />
                        <span className="font-medium">This booking has been cancelled</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        Refund will be processed within 3-5 business days.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Bookings;