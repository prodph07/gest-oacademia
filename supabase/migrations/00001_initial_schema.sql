-- Enums
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'late');

-- Tabela: gyms (Tenants)
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  cnpj VARCHAR UNIQUE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  pagarme_recipient_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  modality VARCHAR,
  belt_rank VARCHAR,
  payment_status payment_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_name VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  frequency VARCHAR NOT NULL, -- e.g., 'monthly', 'quarterly', 'yearly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela: classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_name VARCHAR NOT NULL,
  max_capacity INTEGER,
  schedule TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Policies for gyms
CREATE POLICY "Gyms are viewable by everyone" ON gyms FOR SELECT USING (true);
CREATE POLICY "Gym admins can update their own gym" ON gyms FOR UPDATE USING (auth.uid() = admin_user_id);
CREATE POLICY "Gym admins can insert their own gym" ON gyms FOR INSERT WITH CHECK (auth.uid() = admin_user_id);

-- Helper function to get user's gym
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT id FROM gyms WHERE admin_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for students
CREATE POLICY "Users can view students of their gym" ON students FOR SELECT USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can insert students to their gym" ON students FOR INSERT WITH CHECK (tenant_id = get_user_gym_id());
CREATE POLICY "Users can update students of their gym" ON students FOR UPDATE USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can delete students of their gym" ON students FOR DELETE USING (tenant_id = get_user_gym_id());

-- Policies for plans
CREATE POLICY "Users can view plans of their gym" ON plans FOR SELECT USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can insert plans to their gym" ON plans FOR INSERT WITH CHECK (tenant_id = get_user_gym_id());
CREATE POLICY "Users can update plans of their gym" ON plans FOR UPDATE USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can delete plans of their gym" ON plans FOR DELETE USING (tenant_id = get_user_gym_id());

-- Policies for classes
CREATE POLICY "Users can view classes of their gym" ON classes FOR SELECT USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can insert classes to their gym" ON classes FOR INSERT WITH CHECK (tenant_id = get_user_gym_id());
CREATE POLICY "Users can update classes of their gym" ON classes FOR UPDATE USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can delete classes of their gym" ON classes FOR DELETE USING (tenant_id = get_user_gym_id());
