-- Adicionar vinculação de Autenticação na tabela students
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR;
