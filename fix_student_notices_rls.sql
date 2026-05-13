-- Permitir que alunos autenticados leiam os avisos da academia deles
CREATE POLICY "Students can view gym notices"
ON notices
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM students WHERE auth_user_id = auth.uid()));
