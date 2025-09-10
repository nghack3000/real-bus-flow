import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const CreateTrip = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const generateSeatLayout = (totalSeats: number, busType: string) => {
    const rows = Math.ceil(totalSeats / 4); // Assuming 4 seats per row (2+2 layout)
    const layout = {
      total_seats: totalSeats,
      rows: rows,
      columns: 4,
      seat_configuration: '2+2', // 2 seats + aisle + 2 seats
    };
    return layout;
  };

  const createSeats = async (tripId: string, totalSeats: number, basePrice: number) => {
    const seats = [];
    let seatNumber = 1;

    for (let row = 1; row <= Math.ceil(totalSeats / 4); row++) {
      for (let col = 1; col <= 4 && seatNumber <= totalSeats; col++) {
        // Add premium pricing for front rows
        const premiumMultiplier = row <= 2 ? 1.2 : 1;
        const price = Math.round(basePrice * premiumMultiplier * 100) / 100;

        seats.push({
          trip_id: tripId,
          seat_number: `${seatNumber}`,
          row_number: row,
          column_position: col,
          seat_type: row <= 2 ? 'premium' : 'standard',
          price: price,
          status: 'available',
        });
        seatNumber++;
      }
    }

    const { error } = await supabase.from('seats').insert(seats);
    if (error) throw error;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const tripData = {
        organizer_id: user.id,
        route_from: formData.get('route_from') as string,
        route_to: formData.get('route_to') as string,
        departure_time: formData.get('departure_time') as string,
        arrival_time: formData.get('arrival_time') as string,
        bus_type: formData.get('bus_type') as 'standard' | 'luxury' | 'double_decker',
        total_seats: parseInt(formData.get('total_seats') as string),
        base_price: parseFloat(formData.get('base_price') as string),
        booking_window_start: new Date().toISOString(),
        booking_window_end: formData.get('booking_window_end') as string,
        seat_layout: generateSeatLayout(
          parseInt(formData.get('total_seats') as string),
          formData.get('bus_type') as string
        ),
      };

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from('bus_trips')
        .insert(tripData)
        .select()
        .single();

      if (tripError) throw tripError;

      // Create seats
      await createSeats(trip.id, tripData.total_seats, tripData.base_price);

      toast({
        title: "Trip created successfully",
        description: "Your bus trip is now available for booking",
      });

      navigate('/organizer');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Error",
        description: "Failed to create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Bus Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route_from">From</Label>
                  <Input
                    id="route_from"
                    name="route_from"
                    placeholder="e.g., New York"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route_to">To</Label>
                  <Input
                    id="route_to"
                    name="route_to"
                    placeholder="e.g., Boston"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departure_time">Departure Time</Label>
                  <Input
                    id="departure_time"
                    name="departure_time"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrival_time">Arrival Time</Label>
                  <Input
                    id="arrival_time"
                    name="arrival_time"
                    type="datetime-local"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bus_type">Bus Type</Label>
                  <Select name="bus_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bus type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="double_decker">Double Decker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_seats">Total Seats</Label>
                  <Select name="total_seats" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 seats</SelectItem>
                      <SelectItem value="32">32 seats</SelectItem>
                      <SelectItem value="40">40 seats</SelectItem>
                      <SelectItem value="52">52 seats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price ($)</Label>
                  <Input
                    id="base_price"
                    name="base_price"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="50.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_window_end">Booking Deadline</Label>
                <Input
                  id="booking_window_end"
                  name="booking_window_end"
                  type="datetime-local"
                  required
                />
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Seat Pricing</h4>
                <p className="text-sm text-muted-foreground">
                  Front rows (1-2) will be automatically priced 20% higher as premium seats. 
                  Standard seats will use the base price you set above.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Trip...' : 'Create Trip'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateTrip;