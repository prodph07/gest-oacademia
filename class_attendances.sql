-- 8. Tabela: class_attendances (Presenças nas Aulas)
CREATE TABLE IF NOT EXISTS class_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(class_id, student_id) -- Impede que o mesmo aluno faça check-in duas vezes na mesma aula
);

-- RLS
ALTER TABLE class_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso seguro as presencas" ON class_attendances FOR ALL USING (tenant_id = get_user_gym_id()) WITH CHECK (tenant_id = get_user_gym_id());
