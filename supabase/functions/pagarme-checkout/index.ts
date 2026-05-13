import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customer, items, payments, gym_recipient_id } = await req.json();

    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');
    const masterRecipientId = Deno.env.get('MASTER_RECIPIENT_ID'); // ID do Dono do SaaS

    if (!pagarmeSecretKey || !masterRecipientId) {
      throw new Error("Configurações do servidor (Chaves/Master ID) estão ausentes.");
    }

    if (!gym_recipient_id) {
      throw new Error("gym_recipient_id é obrigatório para realizar o split.");
    }

    const basicAuth = btoa(`${pagarmeSecretKey}:`);

    // Injetar regras de Split nos pagamentos
    const processedPayments = payments.map((payment: any) => {
      // Validar método (credit_card ou pix)
      return {
        ...payment,
        split: [
          {
            recipient_id: gym_recipient_id,
            type: "percentage",
            amount: 98,
            options: {
              charge_processing_fee: true,
              liable: true,
              charge_remainder_fee: true
            }
          },
          {
            recipient_id: masterRecipientId,
            type: "percentage",
            amount: 2,
            options: {
              charge_processing_fee: false,
              liable: false,
              charge_remainder_fee: false
            }
          }
        ]
      };
    });

    const payload = {
      customer,
      items,
      payments: processedPayments
    };

    console.log("Iniciando checkout na Pagar.me...");

    const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const pagarmeData = await pagarmeResponse.json();

    if (!pagarmeResponse.ok) {
      console.error("Pagar.me Error:", pagarmeData);
      return new Response(JSON.stringify({ error: pagarmeData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Retorna os dados simplificados para o frontend (Ex: QR Code PIX ou Status)
    return new Response(JSON.stringify({ 
      order_id: pagarmeData.id,
      status: pagarmeData.status,
      charges: pagarmeData.charges
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Internal Server Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
