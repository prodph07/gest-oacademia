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
    const { amountInCents, gym_recipient_id } = await req.json();

    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');
    const masterRecipientId = Deno.env.get('MASTER_RECIPIENT_ID');

    if (!pagarmeSecretKey || !masterRecipientId) {
      throw new Error("Configurações do servidor (Chaves/Master ID) estão ausentes.");
    }

    if (!gym_recipient_id) {
      throw new Error("gym_recipient_id é obrigatório para realizar o split.");
    }

    const basicAuth = btoa(`${pagarmeSecretKey}:`);

    // 1. Criar o Plano de Assinatura primeiro (exigência da Pagar.me para Payment Links de assinatura)
    const planPayload = {
      name: `Assinatura Recorrente`,
      description: "Plano Mensal Academia",
      interval: "month",
      interval_count: 1,
      payment_methods: ["credit_card"],
      items: [
        {
          name: "Mensalidade",
          quantity: 1,
          pricing_scheme: {
            scheme_type: "unit",
            price: amountInCents
          }
        }
      ]
    };

    const planRes = await fetch('https://api.pagar.me/core/v5/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planPayload),
    });

    const planData = await planRes.json();
    if (!planRes.ok) {
      console.error("Erro ao criar Plano Pagar.me:", planData);
      return new Response(JSON.stringify({ success: false, error: { message: "Falha ao criar o plano base: " + JSON.stringify(planData) } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const planId = planData.id;

    // 2. Criar o Link de Pagamento vinculado ao Plano
    const payload = {
      name: "Assinatura Mensal - Academia",
      type: "subscription",
      payment_settings: {
        accepted_payment_methods: ["credit_card"],
        credit_card_settings: {
          operation_type: "auth_and_capture"
        }
      },
      cart_settings: {
        recurrences: [
          {
            plan_id: planId
          }
        ]
      }
    };

    console.log("Gerando Link de Assinatura Pagar.me...");

    const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/paymentlinks', {
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
      return new Response(JSON.stringify({ success: false, error: pagarmeData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // A Pagar.me retorna a URL do link em `url`
    return new Response(JSON.stringify({ 
      success: true,
      link_id: pagarmeData.id,
      url: pagarmeData.url,
      status: pagarmeData.status
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
