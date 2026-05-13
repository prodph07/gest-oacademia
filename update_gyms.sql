-- Adiciona a coluna de mensalidade na tabela de academias
ALTER TABLE gyms 
ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER DEFAULT 15000;

-- Adiciona comentário para documentação
COMMENT ON COLUMN gyms.monthly_fee_cents IS 'Valor padrão da mensalidade da academia em centavos (ex: 15000 = R$ 150,00)';
