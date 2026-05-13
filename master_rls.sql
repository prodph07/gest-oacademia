-- Políticas de Segurança (RLS) para o Master Admin
-- Isso permite que o usuário 'master@saas.com' possa visualizar e gerenciar dados de TODOS os clientes.

-- 1. Políticas para a tabela Gyms (Academias)
CREATE POLICY "Master pode acessar todas as academias" 
ON gyms 
FOR ALL 
USING ((auth.jwt() ->> 'email') = 'master@saas.com');

-- 2. Políticas para a tabela Students (Alunos)
CREATE POLICY "Master pode acessar todos os alunos" 
ON students 
FOR ALL 
USING ((auth.jwt() ->> 'email') = 'master@saas.com');

-- 3. Políticas para a tabela Orders (Pedidos/Transações)
CREATE POLICY "Master pode acessar todos os pedidos" 
ON orders 
FOR ALL 
USING ((auth.jwt() ->> 'email') = 'master@saas.com');

-- 4. Políticas para a tabela Classes (Aulas)
CREATE POLICY "Master pode acessar todas as aulas" 
ON classes 
FOR ALL 
USING ((auth.jwt() ->> 'email') = 'master@saas.com');

-- 5. Políticas para a tabela Class Attendances (Presenças)
CREATE POLICY "Master pode acessar todas as presenças" 
ON class_attendances 
FOR ALL 
USING ((auth.jwt() ->> 'email') = 'master@saas.com');
