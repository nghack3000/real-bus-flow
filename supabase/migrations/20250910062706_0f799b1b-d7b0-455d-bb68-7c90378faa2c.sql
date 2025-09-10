-- Create enum types
CREATE TYPE seat_status AS ENUM ('available', 'held', 'sold');
CREATE TYPE bus_type AS ENUM ('standard', 'luxury', 'double_decker');

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bus trips table
CREATE TABLE public.bus_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_from TEXT NOT NULL,
  route_to TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  bus_type bus_type NOT NULL DEFAULT 'standard',
  total_seats INTEGER NOT NULL DEFAULT 40,
  seat_layout JSONB NOT NULL, -- Store seat map configuration
  base_price DECIMAL(10,2) NOT NULL,
  booking_window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  booking_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create seats table
CREATE TABLE public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.bus_trips(id) ON DELETE CASCADE NOT NULL,
  seat_number TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  column_position INTEGER NOT NULL,
  seat_type TEXT DEFAULT 'standard', -- standard, premium, etc.
  price DECIMAL(10,2) NOT NULL,
  status seat_status DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(trip_id, seat_number)
);

-- Create seat holds table
CREATE TABLE public.seat_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES public.seats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seat_id)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.bus_trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_email TEXT NOT NULL,
  passenger_phone TEXT,
  seat_numbers TEXT[] NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  booking_reference TEXT UNIQUE NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create booking_seats junction table
CREATE TABLE public.booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  seat_id UUID REFERENCES public.seats(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(booking_id, seat_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view and update own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for bus trips
CREATE POLICY "Anyone can view published trips" ON public.bus_trips
  FOR SELECT USING (booking_window_start <= now() AND booking_window_end >= now());

CREATE POLICY "Organizers can manage their trips" ON public.bus_trips
  FOR ALL USING (auth.uid() = organizer_id);

-- RLS Policies for seats
CREATE POLICY "Anyone can view seats for published trips" ON public.seats
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.bus_trips 
    WHERE id = trip_id 
    AND booking_window_start <= now() 
    AND booking_window_end >= now()
  ));

CREATE POLICY "Trip organizers can manage seats" ON public.seats
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.bus_trips 
    WHERE id = trip_id 
    AND organizer_id = auth.uid()
  ));

-- RLS Policies for seat holds
CREATE POLICY "Users can view and manage their holds" ON public.seat_holds
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for bookings
CREATE POLICY "Users can view their bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trip organizers can view bookings for their trips" ON public.bookings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.bus_trips 
    WHERE id = trip_id 
    AND organizer_id = auth.uid()
  ));

-- RLS Policies for booking_seats
CREATE POLICY "Users can view their booking seats" ON public.booking_seats
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create booking seats" ON public.booking_seats
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = booking_id 
    AND user_id = auth.uid()
  ));

-- Create functions for timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bus_trips_updated_at BEFORE UPDATE ON public.bus_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON public.seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up expired holds
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS void AS $$
BEGIN
  -- Update seats to available where holds have expired
  UPDATE public.seats 
  SET status = 'available', updated_at = now()
  WHERE id IN (
    SELECT seat_id 
    FROM public.seat_holds 
    WHERE expires_at <= now()
  );
  
  -- Delete expired holds
  DELETE FROM public.seat_holds WHERE expires_at <= now();
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for seat updates
ALTER TABLE public.seats REPLICA IDENTITY FULL;
ALTER TABLE public.seat_holds REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;