import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRealtimeTrips, useTripUpdates } from '@/hooks/useRealtimeTrips';
import { MapPin, Clock, Bus, Search, Filter, Calendar } from 'lucide-react';
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
  available_seats: number;
}

const Index = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const navigate = useNavigate();

  // Set up realtime subscriptions for new trips
  useRealtimeTrips();

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [trips, searchFrom, searchTo, searchDate]);

  // Listen to realtime trip updates
  useTripUpdates(useCallback((update: any) => {
    if (update.eventType === 'INSERT') {
      // Fetch fresh trip data to get available seats count
      fetchTrips();
      toast({
        title: "New trip available!",
        description: `${update.new.route_from} → ${update.new.route_to}`,
      });
    }
  }, []));

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_trips')
        .select(`
          *,
          seats!inner(status)
        `)
        .gte('booking_window_end', new Date().toISOString())
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true });

      if (error) throw error;

      // Calculate available seats for each trip
      const tripsWithAvailableSeats = (data || []).map(trip => {
        const seatCounts = trip.seats.reduce((acc: any, seat: any) => {
          acc[seat.status] = (acc[seat.status] || 0) + 1;
          return acc;
        }, {});

        return {
          ...trip,
          available_seats: seatCounts.available || 0,
          seats: undefined, // Remove seats array to clean up response
        };
      });

      setTrips(tripsWithAvailableSeats);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load available trips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = trips;

    if (searchFrom) {
      filtered = filtered.filter(trip =>
        trip.route_from.toLowerCase().includes(searchFrom.toLowerCase())
      );
    }

    if (searchTo) {
      filtered = filtered.filter(trip =>
        trip.route_to.toLowerCase().includes(searchTo.toLowerCase())
      );
    }

    if (searchDate) {
      const searchDateTime = new Date(searchDate);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.departure_time);
        return tripDate.toDateString() === searchDateTime.toDateString();
      });
    }

    setFilteredTrips(filtered);
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
        {/* Hero Section */}
        <div className="text-center py-16 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-2xl border border-primary/20 shadow-lg">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Find Your Perfect Bus Journey
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Book comfortable, reliable bus tickets with real-time seat selection and instant confirmation
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-seat-available rounded-full"></div>
              <span>Real-time availability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-seat-selected rounded-full"></div>
              <span>Instant booking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span>Secure payment</span>
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <Input
                  placeholder="Departure city"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <Input
                  placeholder="Destination city"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchFrom('');
                    setSearchTo('');
                    setSearchDate('');
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Trips Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Available Trips</h2>
            <Badge variant="outline" className="text-primary border-primary">
              {filteredTrips.length} trips found
            </Badge>
          </div>
        </div>
        
        {filteredTrips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No trips found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or check back later for new trips
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-l-4 border-l-primary group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {trip.route_from} → {trip.route_to}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className="bg-gradient-to-r from-primary/10 to-secondary/10 text-primary border-primary/20"
                    >
                      {trip.bus_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{trip.route_from} to {trip.route_to}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{format(new Date(trip.departure_time), 'MMM dd, yyyy')}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(trip.departure_time), 'h:mm a')} - {format(new Date(trip.arrival_time), 'h:mm a')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Bus className="h-4 w-4 text-muted-foreground" />
                    <span>{trip.available_seats} of {trip.total_seats} seats available</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">From ${trip.base_price}</span>
                    <Badge variant={trip.available_seats > 10 ? "default" : trip.available_seats > 0 ? "destructive" : "secondary"}>
                      {trip.available_seats > 10 ? "Available" : trip.available_seats > 0 ? "Few Left" : "Sold Out"}
                    </Badge>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => navigate(`/trip/${trip.id}`)}
                    disabled={trip.available_seats === 0}
                  >
                    {trip.available_seats === 0 ? 'Sold Out' : 'Select Seats'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;