import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratamento de CORS para preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, document, default_bank_account } = await req.json();

    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');
    
    if (!pagarmeSecretKey) {
      throw new Error("PAGARME_SECRET_KEY is not set");
    }

    // Encoding Basic Auth base64 (sk_test: ou sk_live:)
    const basicAuth = btoa(`${pagarmeSecretKey}:`);

    const payload = {
      name,
      email,
      document,
      type: document.length > 11 ? 'company' : 'individual',
      default_bank_account: {
        holder_name: default_bank_account.holder_name || name,
        holder_type: document.length > 11 ? 'company' : 'individual',
        holder_document: document,
        bank: default_bank_account.bank, // Ex: '341' (Itaú)
        branch_number: default_bank_account.branch_number, // Ex: '1234'
        branch_check_digit: default_bank_account.branch_check_digit, // Ex: '1'
        account_number: default_bank_account.account_number, // Ex: '12345'
        account_check_digit: default_bank_account.account_check_digit, // Ex: '1'
        type: default_bank_account.type || 'checking' // 'checking' (corrente) ou 'savings' (poupança)
      },
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: "daily",
        transfer_day: 0
      }
    };

    console.log("Creating Pagar.me Recipient:", payload.name);

    const pagarmeResponse = await fetch('https://api.pagar.me/core/v5/recipients', {
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

    return new Response(JSON.stringify({ recipient_id: pagarmeData.id }), {
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
