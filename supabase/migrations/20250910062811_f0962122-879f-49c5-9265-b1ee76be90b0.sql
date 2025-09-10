-- Fix security definer functions with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;