-- Add RLS policy to allow organizers to update bookings for cancellations
CREATE POLICY "Trip organizers can update bookings for their trips" 
ON public.bookings 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 
  FROM bus_trips 
  WHERE bus_trips.id = bookings.trip_id 
  AND bus_trips.organizer_id = auth.uid()
));