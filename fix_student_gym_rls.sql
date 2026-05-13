-- Permitir que alunos autenticados leiam os dados da academia deles
CREATE POLICY "Students can view their gym"
ON gyms
FOR SELECT
USING (id IN (SELECT tenant_id FROM students WHERE auth_user_id = auth.uid()));
