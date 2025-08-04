-- Create the user_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'barber');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the profiles table to use the user_role enum
DO $$ BEGIN
    ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE user_role USING role::user_role;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;