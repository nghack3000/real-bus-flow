import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { PassengerList } from '@/components/PassengerList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Trash2, Users, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Trip {
  id: string;
  route_from: string;
  route_to: string;
  departure_time: string;
  arrival_time: string;
  bus_type: string;
  total_seats: number;
  base_price: number;
  booking_window_start: string;
  booking_window_end: string;
}

interface Booking {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  seat_numbers: string[];
  total_amount: number;
  payment_status: string;
  created_at: string;
}

const ManageTrip = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!user || !tripId) {
      navigate('/organizer');
      return;
    }
    fetchTripAndBookings();
  }, [user, tripId, navigate]);

  const fetchTripAndBookings = async () => {
    try {
      const [tripResponse, bookingsResponse] = await Promise.all([
        supabase
          .from('bus_trips')
          .select('*')
          .eq('id', tripId!)
          .eq('organizer_id', user?.id)
          .single(),
        supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', tripId!)
          .order('created_at', { ascending: false })
      ]);

      if (tripResponse.error) throw tripResponse.error;
      if (bookingsResponse.error) throw bookingsResponse.error;

      setTrip(tripResponse.data);
      setBookings(bookingsResponse.data || []);
    } catch (error) {
      console.error('Error fetching trip data:', error);
      toast({
        title: "Error",
        description: "Failed to load trip details",
        variant: "destructive",
      });
      navigate('/organizer');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!trip) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('bus_trips')
        .update({
          route_from: trip.route_from,
          route_to: trip.route_to,
          departure_time: trip.departure_time,
          arrival_time: trip.arrival_time,
          bus_type: trip.bus_type as 'standard' | 'luxury',
          base_price: trip.base_price,
          booking_window_end: trip.booking_window_end,
        })
        .eq('id', trip.id);

      if (error) throw error;

      // Send update notifications to passengers
      await notifyPassengersOfUpdate();

      setEditMode(false);
      toast({
        title: "Trip updated",
        description: "Trip details have been updated and passengers have been notified",
      });
    } catch (error) {
      console.error('Error updating trip:', error);
      toast({
        title: "Error",
        description: "Failed to update trip",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const notifyPassengersOfUpdate = async () => {
    if (!trip || bookings.length === 0) return;

    try {
      await supabase.functions.invoke('send-trip-update-notification', {
        body: {
          tripDetails: trip,
          bookings: bookings.map(b => ({
            passengerEmail: b.passenger_email,
            passengerName: b.passenger_name,
            bookingReference: b.booking_reference,
            seatNumbers: b.seat_numbers,
          })),
        },
      });
    } catch (error) {
      console.error('Failed to send update notifications:', error);
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;

    try {
      // Delete related bookings first
      await supabase
        .from('bookings')
        .delete()
        .eq('trip_id', trip.id);

      // Delete related seats
      await supabase
        .from('seats')
        .delete()
        .eq('trip_id', trip.id);

      // Delete the trip
      await supabase
        .from('bus_trips')
        .delete()
        .eq('id', trip.id);

      // Send cancellation notifications
      await notifyPassengersOfCancellation();

      toast({
        title: "Trip deleted",
        description: "Trip has been deleted and passengers have been notified",
      });

      navigate('/organizer');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: "Failed to delete trip",
        variant: "destructive",
      });
    }
  };

  const notifyPassengersOfCancellation = async () => {
    if (!trip || bookings.length === 0) return;

    try {
      await supabase.functions.invoke('send-trip-cancellation-notification', {
        body: {
          tripDetails: trip,
          bookings: bookings.map(b => ({
            passengerEmail: b.passenger_email,
            passengerName: b.passenger_name,
            bookingReference: b.booking_reference,
            totalAmount: b.total_amount,
          })),
        },
      });
    } catch (error) {
      console.error('Failed to send cancellation notifications:', error);
    }
  };

  const downloadPassengerList = () => {
    if (bookings.length === 0) return;

    const csv = [
      ['Booking Reference', 'Passenger Name', 'Email', 'Phone', 'Seats', 'Amount', 'Status'],
      ...bookings.map(booking => [
        booking.booking_reference,
        booking.passenger_name,
        booking.passenger_email,
        booking.passenger_phone || '',
        booking.seat_numbers.join('; '),
        `₹${booking.total_amount}`,
        booking.payment_status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passenger-list-${trip?.route_from}-${trip?.route_to}-${format(new Date(trip?.departure_time || ''), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading || !trip) {
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/organizer')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizer Panel
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Trip</h1>
            <p className="text-muted-foreground">{trip.route_from} → {trip.route_to}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Real-time Passenger List */}
          <PassengerList tripId={tripId!} organizerId={user.id} />

          <div className="grid lg:grid-cols-2 gap-6">
          {/* Trip Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Trip Details</CardTitle>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button size="sm" onClick={handleSaveChanges} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="route_from">From</Label>
                  <Input
                    id="route_from"
                    value={trip.route_from}
                    onChange={(e) => setTrip({ ...trip, route_from: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="route_to">To</Label>
                  <Input
                    id="route_to"
                    value={trip.route_to}
                    onChange={(e) => setTrip({ ...trip, route_to: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departure_time">Departure</Label>
                  <Input
                    id="departure_time"
                    type="datetime-local"
                    value={new Date(trip.departure_time).toISOString().slice(0, 16)}
                    onChange={(e) => setTrip({ ...trip, departure_time: new Date(e.target.value).toISOString() })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label htmlFor="arrival_time">Arrival</Label>
                  <Input
                    id="arrival_time"
                    type="datetime-local"
                    value={new Date(trip.arrival_time).toISOString().slice(0, 16)}
                    onChange={(e) => setTrip({ ...trip, arrival_time: new Date(e.target.value).toISOString() })}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bus_type">Bus Type</Label>
                  <Select
                    value={trip.bus_type}
                    onValueChange={(value) => setTrip({ ...trip, bus_type: value })}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="base_price">Base Price (₹)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    value={trip.base_price}
                    onChange={(e) => setTrip({ ...trip, base_price: parseFloat(e.target.value) })}
                    disabled={!editMode}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="booking_window_end">Booking Closes</Label>
                <Input
                  id="booking_window_end"
                  type="datetime-local"
                  value={new Date(trip.booking_window_end).toISOString().slice(0, 16)}
                  onChange={(e) => setTrip({ ...trip, booking_window_end: new Date(e.target.value).toISOString() })}
                  disabled={!editMode}
                />
              </div>

              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Trip
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this trip? This action cannot be undone.
                        All passengers will be notified of the cancellation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTrip}>
                        Delete Trip
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bookings ({bookings.length})
              </CardTitle>
              {bookings.length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadPassengerList}>
                  <Download className="h-4 w-4 mr-2" />
                  Download List
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bookings yet</p>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{booking.passenger_name}</span>
                        <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
                          {booking.payment_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Reference: {booking.booking_reference}</p>
                        <p>Email: {booking.passenger_email}</p>
                        <p>Seats: {booking.seat_numbers.join(', ')}</p>
                        <p>Amount: ₹{booking.total_amount}</p>
                        <p>Booked: {format(new Date(booking.created_at), 'MMM dd, yyyy h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManageTrip;