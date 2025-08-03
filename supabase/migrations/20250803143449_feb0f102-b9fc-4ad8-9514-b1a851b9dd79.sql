-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('customer', 'barber', 'admin');

-- Create enum for booking status
CREATE TYPE booking_status AS ENUM ('waiting', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create barber_shops table
CREATE TABLE public.barber_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_name TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  services JSONB DEFAULT '[]'::jsonb,
  working_hours JSONB DEFAULT '{}'::jsonb,
  cover_image_url TEXT,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  max_queue_limit INTEGER DEFAULT 10,
  avg_service_duration INTEGER DEFAULT 30, -- in minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.barber_shops(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  service_price DECIMAL(10,2),
  status booking_status DEFAULT 'waiting',
  queue_position INTEGER,
  estimated_wait_time INTEGER, -- in minutes
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.barber_shops(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review_text TEXT,
  tags TEXT[], -- array of tags like 'clean', 'friendly', 'fast'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, booking_id)
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.barber_shops(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

-- Create barber registration requests table (for the custom registration flow)
CREATE TABLE public.barber_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  services_offered TEXT NOT NULL,
  working_hours TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_registration_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for barber_shops
CREATE POLICY "Everyone can view active barber shops" ON public.barber_shops FOR SELECT USING (is_active = true);
CREATE POLICY "Barbers can update their own shop" ON public.barber_shops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Barbers can insert their own shop" ON public.barber_shops FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Barbers can view bookings for their shop" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.barber_shops WHERE barber_shops.user_id = auth.uid() AND barber_shops.id = bookings.shop_id)
);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Barbers can update bookings for their shop" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.barber_shops WHERE barber_shops.user_id = auth.uid() AND barber_shops.id = bookings.shop_id)
);

-- Create RLS policies for reviews
CREATE POLICY "Everyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for favorites
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for barber registration requests (no authentication required)
CREATE POLICY "Anyone can submit registration requests" ON public.barber_registration_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can view registration requests" ON public.barber_registration_requests FOR SELECT USING (false); -- Will be updated when admin role is implemented

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    COALESCE((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_barber_shops_updated_at BEFORE UPDATE ON public.barber_shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate queue positions and estimated wait times
CREATE OR REPLACE FUNCTION public.update_queue_positions(shop_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
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

-- Create function to update shop statistics when reviews are added
CREATE OR REPLACE FUNCTION public.update_shop_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
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

-- Create trigger to update shop rating when review is added
CREATE TRIGGER update_shop_rating_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_shop_rating();

-- Enable realtime for tables that need live updates
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.barber_shops REPLICA IDENTITY FULL;
ALTER TABLE public.reviews REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_shops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;