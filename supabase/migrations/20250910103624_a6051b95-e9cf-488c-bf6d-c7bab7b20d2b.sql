-- Insert sample bus trips for demonstration
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
  'a0000000-0000-0000-0000-000000000001',
  'New York',
  'Boston',
  '2025-01-15 08:00:00+00',
  '2025-01-15 12:30:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  45.00,
  now(),
  '2025-01-15 06:00:00+00'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Boston',
  'Washington DC',
  '2025-01-16 14:00:00+00',
  '2025-01-16 20:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  35.00,
  now(),
  '2025-01-16 12:00:00+00'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Los Angeles',
  'San Francisco',
  '2025-01-17 09:00:00+00',
  '2025-01-17 15:30:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  55.00,
  now(),
  '2025-01-17 07:00:00+00'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Chicago',
  'Detroit',
  '2025-01-18 11:00:00+00',
  '2025-01-18 16:00:00+00',
  'standard',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  40.00,
  now(),
  '2025-01-18 09:00:00+00'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Miami',
  'Orlando',
  '2025-01-19 07:30:00+00',
  '2025-01-19 11:30:00+00',
  'luxury',
  40,
  '{"rows": 10, "columns": 4, "aisles": [2]}',
  50.00,
  now(),
  '2025-01-19 05:30:00+00'
);

-- Function to generate seats for a trip
CREATE OR REPLACE FUNCTION generate_seats_for_trip(trip_id UUID)
RETURNS void AS $$
DECLARE
  seat_layout JSONB;
  total_rows INTEGER;
  total_columns INTEGER;
  base_price NUMERIC;
  current_row INTEGER;
  current_col INTEGER;
  seat_num TEXT;
  seat_price NUMERIC;
BEGIN
  -- Get trip details
  SELECT bt.seat_layout, bt.base_price
  INTO seat_layout, base_price
  FROM bus_trips bt
  WHERE bt.id = trip_id;

  total_rows := (seat_layout->>'rows')::INTEGER;
  total_columns := (seat_layout->>'columns')::INTEGER;

  -- Generate seats for each row and column
  FOR current_row IN 1..total_rows LOOP
    FOR current_col IN 1..total_columns LOOP
      -- Generate seat number (A, B, C, D format)
      seat_num := current_row || chr(64 + current_col);
      
      -- Calculate price based on position (front rows cost more)
      seat_price := base_price + (CASE 
        WHEN current_row <= 3 THEN 10  -- Premium front seats
        WHEN current_row >= total_rows - 2 THEN 5  -- Slightly more for back seats
        ELSE 0  -- Standard price for middle seats
      END);

      -- Insert seat
      INSERT INTO public.seats (
        trip_id,
        seat_number,
        row_number,
        column_position,
        price,
        status,
        seat_type
      ) VALUES (
        trip_id,
        seat_num,
        current_row,
        current_col,
        seat_price,
        'available',
        CASE 
          WHEN current_row <= 3 THEN 'premium'
          ELSE 'standard'
        END
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate seats for all sample trips
DO $$
DECLARE
  trip_record RECORD;
BEGIN
  FOR trip_record IN 
    SELECT id FROM public.bus_trips 
    WHERE route_from IN ('New York', 'Boston', 'Los Angeles', 'Chicago', 'Miami')
  LOOP
    PERFORM generate_seats_for_trip(trip_record.id);
  END LOOP;
END $$;