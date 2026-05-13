-- Adicionar colunas de Responsável e Data de Nascimento na tabela students
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name VARCHAR;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR;
