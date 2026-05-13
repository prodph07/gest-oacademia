/**
 * Mock Service para simular integração com a API da Pagar.me V5.
 * Isso prepara o terreno para a implementação real via Supabase Edge Functions.
 */

// Tipagem do payload de Split para a Pagar.me V5
export interface SplitRule {
  recipient_id: string; // ID do recebedor na Pagar.me
  percentage: number;   // Percentual (ex: 98 para 98%)
  amount?: number;      // Ou valor fixo em centavos
  charge_processing_fee: boolean; // Se este recebedor pagará a taxa do gateway
  liable: boolean;      // Se este recebedor assume o risco de chargeback
}

export interface PagarmeCheckoutPayload {
  customer: {
    name: string;
    email: string;
    document: string; // CPF/CNPJ
    phones: {
      mobile_phone: {
        country_code: string;
        area_code: string;
        number: string;
      };
    };
  };
  items: Array<{
    amount: number; // Em centavos
    description: string;
    quantity: number;
  }>;
  payments: Array<{
    payment_method: 'credit_card' | 'pix';
    amount: number; // Em centavos
    split: SplitRule[];
  }>;
}

/**
 * Simula a criação de um "Recebedor Secundário" (Gym) no onboarding.
 * Na vida real, isso chamaria uma Edge Function que comunicaria com a Pagar.me.
 */
export const mockOnboardingGym = async (gymName: string, cnpj: string): Promise<string> => {
  console.log(`[Pagar.me Mock] Criando recebedor para a academia: ${gymName} (${cnpj})`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Retorna um ID de recebedor simulado
      const fakeRecipientId = `re_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`[Pagar.me Mock] Recebedor criado com sucesso: ${fakeRecipientId}`);
      resolve(fakeRecipientId);
    }, 1500);
  });
};

/**
 * Simula a criação de uma transação com Split de Pagamentos.
 */
export const mockCreateTransactionWithSplit = async (
  payload: PagarmeCheckoutPayload,
  gymRecipientId: string
) => {
  console.log('[Pagar.me Mock] Iniciando transação com split...', payload);

  // Regra de Negócio:
  // 98% para a Academia (Gym) - E ELA paga a taxa de processamento do cartão/pix.
  // 2% para o Master (Plataforma) - Fica com 2% limpo.
  const masterRecipientId = 're_master_saas_platform_123';

  // Injetando as regras de split no mock
  const processedPayload = {
    ...payload,
    payments: payload.payments.map((p) => ({
      ...p,
      split: [
        {
          recipient_id: gymRecipientId,
          percentage: 98,
          charge_processing_fee: true, // Academia paga a taxa do gateway
          liable: true,
        },
        {
          recipient_id: masterRecipientId,
          percentage: 2,
          charge_processing_fee: false, // SaaS não paga a taxa
          liable: false,
        },
      ],
    })),
  };

  console.log('[Pagar.me Mock] Payload final enviado:', processedPayload);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `or_${Math.random().toString(36).substring(2, 15)}`,
        status: 'pending',
        gateway_response: 'Transaction created successfully. Waiting for webhook confirmation.',
      });
    }, 2000);
  });
};
