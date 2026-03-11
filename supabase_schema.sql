-- Supabase SQL Schema for Orbit Agent Web Client

-- 1. Create User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- For future auth use (REFERENCES auth.users(id))
    provider TEXT DEFAULT 'openrouter',
    model TEXT DEFAULT 'gemini-2.5-flash',
    temperature NUMERIC(2,1) DEFAULT 0.7,
    is_yolo_mode BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Tasks (Sessions) Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active'
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Row Level Security (RLS) is intentionally left disabled 
-- to allow easy insertion while Auth is not fully implemented. 
-- Turn on RLS and write policies when deploying for public multi-user auth.
