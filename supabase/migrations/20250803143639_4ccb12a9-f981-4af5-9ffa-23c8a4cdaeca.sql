-- Fix function search path security warnings by adding search_path parameter

-- Fix the update_queue_positions function
CREATE OR REPLACE FUNCTION public.update_queue_positions(shop_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
SET search_path = ''
AS $$
DECLARE
  booking_record RECORD;
  position_counter INTEGER := 1;
  avg_duration INTEGER;
BEGIN
  -- Get average service duration for the shop
  SELECT avg_service_duration INTO avg_duration FROM public.barber_shops WHERE id = shop_uuid;
  
  -- Update queue positions for waiting bookings
  FOR booking_record IN 
    SELECT id FROM public.bookings 
    WHERE shop_id = shop_uuid AND status = 'waiting' 
    ORDER BY joined_at ASC
  LOOP
    UPDATE public.bookings 
    SET 
      queue_position = position_counter,
      estimated_wait_time = (position_counter - 1) * avg_duration
    WHERE id = booking_record.id;
    
    position_counter := position_counter + 1;
  END LOOP;
END;
$$;

-- Fix the update_shop_rating function
CREATE OR REPLACE FUNCTION public.update_shop_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = ''
AS $$
BEGIN
  -- Update rating average and total reviews count
  UPDATE public.barber_shops 
  SET 
    rating_avg = (
      SELECT ROUND(AVG(rating)::numeric, 2) 
      FROM public.reviews 
      WHERE shop_id = NEW.shop_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE shop_id = NEW.shop_id
    )
  WHERE id = NEW.shop_id;
  
  RETURN NEW;
END;
$$;

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY definer
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;