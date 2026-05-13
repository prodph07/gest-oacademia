-- Adicionar dia da semana na tabela classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS day_of_week VARCHAR;

-- Atualizar o tipo do schedule (horário) na tabela classes se for necessário, 
-- ou apenas manteremos o time no frontend, salvando a string no BD. 
-- Para evitar quebra, apenas adicionamos day_of_week.

-- Criar tabela de Quadro de Avisos (Notices)
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Criar Políticas para Notices (Admin da Academia pode tudo, alunos/público apenas leem no futuro)
CREATE POLICY "Users can view notices of their gym" ON notices FOR SELECT USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can insert notices to their gym" ON notices FOR INSERT WITH CHECK (tenant_id = get_user_gym_id());
CREATE POLICY "Users can update notices of their gym" ON notices FOR UPDATE USING (tenant_id = get_user_gym_id());
CREATE POLICY "Users can delete notices of their gym" ON notices FOR DELETE USING (tenant_id = get_user_gym_id());
