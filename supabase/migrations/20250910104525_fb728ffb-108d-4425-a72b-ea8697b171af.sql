-- Delete existing sample trips and their seats
DELETE FROM public.seats WHERE trip_id IN (
  SELECT id FROM public.bus_trips 
  WHERE route_from IN ('New York', 'Boston', 'Los Angeles', 'Chicago', 'Miami')
);

DELETE FROM public.bus_trips 
WHERE route_from IN ('New York', 'Boston', 'Los Angeles', 'Chicago', 'Miami');

-- Insert Indian city sample trips for demonstration
INSERT INTO public.bus_trips (
  organizer_id,
  route_from,
  route_to,
  departure_time,
  arrival_time,
  bus_type,
  total_seats,
  seat_layout,
  base_price,
  booking_window_start,
  booking_window_end
) VALUES 
(
  gen_random_uuid(),
  'Mumbai',
  'Delhi',
  '2025-09-12 06:00:00+00',
  '2025-09-13 08:00:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  1200.00,
  now(),
  '2025-09-12 04:00:00+00'
),
(
  gen_random_uuid(),
  'Delhi',
  'Bangalore',
  '2025-09-13 20:00:00+00',
  '2025-09-15 10:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  1800.00,
  now(),
  '2025-09-13 18:00:00+00'
),
(
  gen_random_uuid(),
  'Chennai',
  'Hyderabad',
  '2025-09-14 07:30:00+00',
  '2025-09-14 17:30:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  800.00,
  now(),
  '2025-09-14 05:30:00+00'
),
(
  gen_random_uuid(),
  'Kolkata',
  'Pune',
  '2025-09-15 14:00:00+00',
  '2025-09-16 12:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  1500.00,
  now(),
  '2025-09-15 12:00:00+00'
),
(
  gen_random_uuid(),
  'Jaipur',
  'Goa',
  '2025-09-16 21:00:00+00',
  '2025-09-17 21:00:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  1600.00,
  now(),
  '2025-09-16 19:00:00+00'
),
(
  gen_random_uuid(),
  'Mumbai',
  'Goa',
  '2025-09-17 22:00:00+00',
  '2025-09-18 10:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  700.00,
  now(),
  '2025-09-17 20:00:00+00'
),
(
  gen_random_uuid(),
  'Delhi',
  'Agra',
  '2025-09-18 08:00:00+00',
  '2025-09-18 12:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  300.00,
  now(),
  '2025-09-18 06:00:00+00'
),
(
  gen_random_uuid(),
  'Bangalore',
  'Kerala',
  '2025-09-19 06:00:00+00',
  '2025-09-19 18:00:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  900.00,
  now(),
  '2025-09-19 04:00:00+00'
);

-- Generate seats for all new Indian city trips
DO $$
DECLARE
  trip_record RECORD;
BEGIN
  FOR trip_record IN 
    SELECT id FROM public.bus_trips 
    WHERE route_from IN ('Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Jaipur', 'Bangalore')
  LOOP
    PERFORM generate_seats_for_trip(trip_record.id);
  END LOOP;
END $$;