import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Precisamos do Service Role Key para ignorar RLS e atualizar a tabela
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Recebido Webhook:", JSON.stringify(payload));

    const eventType = payload.type;
    
    // A Pagar.me envia order.paid quando o PIX ou Cartão (e assinatura) é aprovado
    if (eventType === 'order.paid') {
      const orderId = payload.data.id; // Ex: or_xxxxx
      const customerDocument = payload.data.customer?.document;
      const amount = payload.data.amount; // in cents

      console.log(`Processando pagamento para o pedido: ${orderId}`);

      // 1. Tentar achar o pedido se foi gerado um PIX manual
      let { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, student_id, tenant_id')
        .eq('gateway_id', orderId)
        .single();

      let studentIdToUpdate = orderData?.student_id;
      let tenantId = orderData?.tenant_id;

      // 2. Se não achou (ex: é uma cobrança recorrente de assinatura que gerou um NOVO orderId)
      if (!orderData && customerDocument) {
        console.log(`Pedido não encontrado. Tentando localizar aluno por CPF: ${customerDocument}`);
        
        // Busca aluno pelo CPF
        const { data: studentData } = await supabase
          .from('students')
          .select('id, tenant_id')
          .eq('document', customerDocument)
          .single();

        if (studentData) {
          studentIdToUpdate = studentData.id;
          tenantId = studentData.tenant_id;

          // Cria a nova ordem como Paga já que é uma renovação de assinatura
          await supabase.from('orders').insert({
            tenant_id: tenantId,
            student_id: studentIdToUpdate,
            gateway_id: orderId,
            amount: amount,
            status: 'paid',
            payment_method: payload.data.charges?.[0]?.payment_method || 'credit_card'
          });
          
          console.log(`Nova ordem criada para cobrança recorrente.`);
        }
      } else if (orderData) {
        // Atualiza a ordem existente para paid
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('gateway_id', orderId);
      }

      if (!studentIdToUpdate) {
        console.error("Aluno não localizado para este pagamento.");
        return new Response(JSON.stringify({ error: "Aluno não localizado" }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Pedido/Assinatura atualizada com sucesso. Aluno ID: ${studentIdToUpdate}`);

      // 3. Atualizar o aluno para 'paid'
      const { error: studentError } = await supabase
        .from('students')
        .update({ payment_status: 'paid' })
        .eq('id', studentIdToUpdate);

      if (studentError) {
        console.error("Erro ao atualizar status do aluno:", studentError);
      } else {
        console.log(`Aluno atualizado para 'paid' com sucesso.`);
      }

      return new Response(JSON.stringify({ message: 'Webhook processado com sucesso' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se não for order.paid, ignorar educadamente para a Pagar.me não ficar reenviando
    return new Response(JSON.stringify({ message: 'Evento ignorado' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Internal Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
