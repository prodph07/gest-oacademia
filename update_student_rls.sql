-- ============================================================
-- RLS: Permitir que alunos autenticados leiam seus próprios dados
-- ============================================================

-- 1. Aluno pode ler seus próprios dados na tabela students
CREATE POLICY "Students can view own data"
ON students
FOR SELECT
USING (auth_user_id = auth.uid());

-- 2. Aluno pode ler seus próprios pedidos (orders)
CREATE POLICY "Students can view own orders"
ON orders
FOR SELECT
USING (student_id IN (
  SELECT id FROM students WHERE auth_user_id = auth.uid()
));

-- 3. Aluno pode ver as aulas da academia dele
CREATE POLICY "Students can view gym classes"
ON classes
FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM students WHERE auth_user_id = auth.uid()
));

-- 4. Aluno pode ver suas presenças
CREATE POLICY "Students can view own attendances"
ON class_attendances
FOR SELECT
USING (student_id IN (
  SELECT id FROM students WHERE auth_user_id = auth.uid()
));
