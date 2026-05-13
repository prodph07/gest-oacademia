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
    const { action, recipient_id, amount } = await req.json();

    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');
    if (!pagarmeSecretKey) {
      throw new Error("PAGARME_SECRET_KEY não configurada.");
    }
    if (!recipient_id) {
      throw new Error("recipient_id é obrigatório.");
    }

    const basicAuth = btoa(`${pagarmeSecretKey}:`);
    const baseHeaders = {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    };

    // ============================================================
    // ACTION: balance — Consultar saldo disponível do recebedor
    // ============================================================
    if (action === 'balance') {
      const response = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient_id}/balance`, {
        method: 'GET',
        headers: baseHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Pagar.me Balance Error:", data);
        return new Response(JSON.stringify({ error: data }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        available_amount: data.available_amount || 0,       // Disponível para saque (centavos)
        waiting_funds_amount: data.waiting_funds_amount || 0, // A liberar (centavos)
        transferred_amount: data.transferred_amount || 0,    // Já sacado (centavos)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // ACTION: withdraw — Solicitar saque
    // ============================================================
    if (action === 'withdraw') {
      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Valor de saque inválido." }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient_id}/withdrawals`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Pagar.me Withdraw Error:", data);
        const errorMsg = data?.message || data?.errors?.[0]?.message || JSON.stringify(data);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        id: data.id,
        status: data.status,
        amount: data.amount,
        created_at: data.created_at,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================================
    // ACTION: list — Listar histórico de saques
    // ============================================================
    if (action === 'list') {
      const response = await fetch(`https://api.pagar.me/core/v5/recipients/${recipient_id}/withdrawals?size=20`, {
        method: 'GET',
        headers: baseHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Pagar.me List Withdrawals Error:", data);
        return new Response(JSON.stringify({ error: data }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        withdrawals: data.data || [],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: "Action inválida. Use 'balance', 'withdraw' ou 'list'." }), {
      status: 400,
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
