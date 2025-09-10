import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, MapPin, Clock, Users, Eye } from 'lucide-react';
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
  booking_window_end: string;
  created_at: string;
}

const Organizer = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchTrips();
  }, [user, navigate]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_trips')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: "Error",
        description: "Failed to load your trips",
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizer Panel</h1>
            <p className="text-muted-foreground">Manage your bus trips and bookings</p>
          </div>
          <Button onClick={() => navigate('/organizer/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Trip
          </Button>
        </div>

        {trips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">No trips yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first bus trip to start accepting bookings
              </p>
              <Button onClick={() => navigate('/organizer/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {trip.route_from} → {trip.route_to}
                    </CardTitle>
                    <Badge variant="secondary">{trip.bus_type}</Badge>
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{trip.total_seats} seats</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">${trip.base_price}</span>
                    <Badge variant={new Date(trip.booking_window_end) > new Date() ? "default" : "secondary"}>
                      {new Date(trip.booking_window_end) > new Date() ? "Active" : "Closed"}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/organizer/manage/${trip.id}`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Organizer;