import { useState } from 'react';
import { QrCode, X, Loader2, CheckCircle2, Link as LinkIcon, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    document: string;
    phone: string;
  };
  gymRecipientId: string;
  gymId: string;
  amountInCents: number;
}

export default function CheckoutModal({ isOpen, onClose, student, gymRecipientId, gymId, amountInCents }: CheckoutModalProps) {
  const [loadingPix, setLoadingPix] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // States for PIX
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);

  // States for Subscription Link
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);

  const generatePix = async () => {
    setLoadingPix(true);
    setError(null);
    try {
      const phoneDigits = (student.phone || "").replace(/\D/g, '');
      const areaCode = phoneDigits.length >= 2 ? phoneDigits.substring(0, 2) : "11";
      const phoneNumber = phoneDigits.length > 2 ? phoneDigits.substring(2, 11) : "999999999";

      const payload = {
        customer: {
          name: student.name,
          email: `${student.id.substring(0, 8)}@aluno.com`,
          type: "individual",
          document: student.document.replace(/\D/g, '') || "00000000000",
          phones: {
            mobile_phone: {
              country_code: "55",
              area_code: areaCode,
              number: phoneNumber
            }
          }
        },
        items: [
          {
            amount: amountInCents,
            description: "Mensalidade Academia",
            quantity: 1
          }
        ],
        payments: [
          {
            payment_method: "pix",
            pix: {
              expires_in: 86400
            }
          }
        ],
        gym_recipient_id: gymRecipientId
      };

      const { data, error } = await supabase.functions.invoke('pagarme-checkout', {
        body: payload
      });

      if (error) throw new Error("Falha na comunicação com gateway.");
      if (data?.error) throw new Error(JSON.stringify(data.error));

      if (data.status === 'failed') {
        const gatewayError = data.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message;
        throw new Error(`A Pagar.me recusou a transação: ${gatewayError || 'Erro desconhecido'}`);
      }

      const pixData = data.charges?.[0]?.last_transaction?.qr_code_url;
      const pixText = data.charges?.[0]?.last_transaction?.qr_code;

      if (!pixData && !pixText) {
        throw new Error(`Pagar.me não retornou os dados do PIX. (Status: ${data.status})`);
      }

      setQrCodeUrl(pixData);
      setQrCodeText(pixText);

      if (data.order_id) {
        await supabase.from('orders').insert({
          tenant_id: gymId,
          student_id: student.id,
          gateway_id: data.order_id,
          amount: amountInCents,
          status: 'pending',
          payment_method: 'pix'
        });
      }

    } catch (err: any) {
      setError(err.message || "Erro ao gerar PIX");
    } finally {
      setLoadingPix(false);
    }
  };

  const generatePaymentLink = async () => {
    setLoadingLink(true);
    setError(null);
    try {
      const payload = {
        amountInCents,
        gym_recipient_id: gymRecipientId,
        student_id: student.id,
        gym_id: gymId
      };

      const { data, error } = await supabase.functions.invoke('pagarme-subscription', {
        body: payload
      });

      if (error) {
        console.error("Invoke Error:", error);
        throw new Error("Falha na rede ao conectar com o servidor.");
      }
      
      if (data?.success === false) {
        console.error("Pagar.me Validation Error:", data.error);
        const errorMessage = data.error?.message || JSON.stringify(data.error);
        throw new Error(`A Pagar.me recusou a criação da assinatura: ${errorMessage}`);
      }

      if (data?.error) throw new Error(JSON.stringify(data.error));
      
      if (!data.url) {
        throw new Error("A Pagar.me não retornou a URL de pagamento.");
      }

      setPaymentLinkUrl(data.url);

      // Não criamos 'order' aqui porque a assinatura criará via Webhook no primeiro pagamento.
      // Opcionalmente poderíamos salvar algo para rastreio.

    } catch (err: any) {
      setError(err.message || "Erro ao gerar Link de Assinatura");
    } finally {
      setLoadingLink(false);
    }
  };

  if (!isOpen) return null;

  const isCompleted = qrCodeUrl || paymentLinkUrl;
  const isLoading = loadingPix || loadingLink;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-surface-200">
          <div className="flex items-center gap-2 text-primary-600">
            <QrCode className="h-5 w-5" />
            <h3 className="font-semibold text-surface-900">Cobrança Mensal</h3>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-surface-500">Cobrando Aluno</p>
            <p className="text-lg font-bold text-surface-900">{student.name}</p>
            <p className="text-2xl font-black text-primary-600 mt-2">
              R$ {(amountInCents / 100).toFixed(2).replace('.', ',')}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {!isCompleted ? (
            <div className="space-y-3">
              <button
                onClick={generatePix}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold transition-all disabled:opacity-70"
              >
                {loadingPix ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> Conectando Pagar.me...</>
                ) : (
                  <><QrCode className="h-5 w-5" /> Gerar QR Code PIX (Único)</>
                )}
              </button>
              
              <button
                onClick={generatePaymentLink}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-surface-900 hover:bg-surface-800 text-white rounded-lg font-semibold transition-all disabled:opacity-70"
              >
                {loadingLink ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> Conectando Pagar.me...</>
                ) : (
                  <><LinkIcon className="h-5 w-5" /> Gerar Link de Assinatura (Cartão)</>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center justify-center gap-2 border border-green-200">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Cobrança Gerada com Sucesso!</span>
              </div>
              
              <div className="text-center text-sm text-surface-500 mb-2">
                Aguardando pagamento do aluno...
              </div>
              
              {/* Resultado PIX */}
              {qrCodeUrl && (
                <div className="flex justify-center p-4 bg-surface-50 rounded-lg border border-surface-200">
                  <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48" />
                </div>
              )}

              {qrCodeText && (
                <div>
                  <p className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Pix Copia e Cola</p>
                  <div className="flex gap-2">
                    <input 
                      readOnly 
                      value={qrCodeText} 
                      className="flex-1 text-xs p-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 focus:outline-none"
                    />
                    <button 
                      onClick={() => navigator.clipboard.writeText(qrCodeText)}
                      className="px-3 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {/* Resultado Link de Assinatura */}
              {paymentLinkUrl && (
                <div>
                  <p className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Link de Pagamento (Seguro)</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={paymentLinkUrl} 
                        className="flex-1 text-xs p-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 focus:outline-none"
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(paymentLinkUrl)}
                        className="px-3 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <LinkIcon className="h-3 w-3" /> Copiar
                      </button>
                    </div>
                    
                    <a 
                      href={`https://wa.me/55${student.phone.replace(/\D/g, '')}?text=Olá ${student.name}! Segue o link para pagamento da sua mensalidade via cartão ou PIX: ${paymentLinkUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-lg font-semibold transition-all text-sm"
                    >
                      <Send className="h-4 w-4" /> Enviar p/ WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
