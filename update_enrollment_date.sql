-- Adicionar coluna de Data de Matrícula (Mês de Entrada) na tabela students
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date DATE;
