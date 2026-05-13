-- Permitir que alunos insiram ordens para si mesmos
CREATE POLICY "Students can insert own orders"
ON orders
FOR INSERT
WITH CHECK (
  student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
  AND
  tenant_id IN (SELECT tenant_id FROM students WHERE auth_user_id = auth.uid())
);
