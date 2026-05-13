import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Loader2, CheckCircle, Clock, AlertCircle, QrCode, X, CheckCircle2, Link as LinkIcon } from 'lucide-react';

export default function StudentFinancial() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [gym, setGym] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: gymData } = await supabase
        .from('gyms')
        .select('id, name, pagarme_recipient_id, monthly_fee_cents')
        .eq('id', studentData.tenant_id)
        .single();
        
      if (gymData) setGym(gymData);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false });

      if (ordersData) setOrders(ordersData);

    } catch (error) {
      console.error('Erro ao buscar financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthFullNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const getAnnualControl = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    let enrollmentMonth = 0;
    let enrollmentYear = currentYear;
    
    if (student?.enrollment_date) {
      const d = new Date(student.enrollment_date);
      enrollmentMonth = d.getUTCMonth();
      enrollmentYear = d.getUTCFullYear();
    }

    return monthNames.map((monthName, index) => {
      if (currentYear < enrollmentYear) return { name: monthName, status: 'inactive', index };
      if (currentYear === enrollmentYear && index < enrollmentMonth) return { name: monthName, status: 'inactive', index };

      const orderInMonth = orders.find(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === index && orderDate.getFullYear() === currentYear;
      });

      if (orderInMonth) {
        if (orderInMonth.status === 'paid') return { name: monthName, status: 'paid', orderId: orderInMonth.id, index };
        if (orderInMonth.status === 'pending') return { name: monthName, status: 'pending', orderId: orderInMonth.id, index };
      }

      if (index < currentMonth) return { name: monthName, status: 'late', index };
      if (index === currentMonth) return { name: monthName, status: 'current', index };
      return { name: monthName, status: 'upcoming', index };
    });
  };

  const openCheckoutForMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setIsCheckoutOpen(true);
    setCheckoutError(null);
    setQrCodeUrl(null);
    setQrCodeText(null);
    setPaymentLinkUrl(null);
  };

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setSelectedMonth(null);
    setCheckoutError(null);
    setQrCodeUrl(null);
    setQrCodeText(null);
    setPaymentLinkUrl(null);
  };

  const generatePix = async () => {
    if (!student || !gym) return;
    setLoadingPix(true);
    setCheckoutError(null);
    try {
      const phoneDigits = (student.phone || "").replace(/\D/g, '');
      const areaCode = phoneDigits.length >= 2 ? phoneDigits.substring(0, 2) : "11";
      const phoneNumber = phoneDigits.length > 2 ? phoneDigits.substring(2, 11) : "999999999";
      const amountInCents = gym.monthly_fee_cents || 15000;

      const payload = {
        customer: {
          name: student.name,
          email: student.email || `${student.id.substring(0, 8)}@aluno.com`,
          type: "individual",
          document: (student.document || "").replace(/\D/g, '') || "00000000000",
          phones: {
            mobile_phone: { country_code: "55", area_code: areaCode, number: phoneNumber }
          }
        },
        items: [{ amount: amountInCents, description: `Mensalidade ${monthFullNames[selectedMonth!]} ${new Date().getFullYear()}`, quantity: 1 }],
        payments: [{ payment_method: "pix", pix: { expires_in: 86400 } }],
        gym_recipient_id: gym.pagarme_recipient_id
      };

      const { data, error } = await supabase.functions.invoke('pagarme-checkout', { body: payload });
      if (error) throw new Error("Falha na comunicação com gateway.");
      if (data?.error) throw new Error(JSON.stringify(data.error));

      if (data.status === 'failed') {
        const gatewayError = data.charges?.[0]?.last_transaction?.gateway_response?.errors?.[0]?.message;
        throw new Error(`Pagar.me recusou: ${gatewayError || 'Erro desconhecido'}`);
      }

      const pixData = data.charges?.[0]?.last_transaction?.qr_code_url;
      const pixText = data.charges?.[0]?.last_transaction?.qr_code;

      if (!pixData && !pixText) {
        throw new Error(`Pagar.me não retornou dados do PIX. (Status: ${data.status})`);
      }

      setQrCodeUrl(pixData);
      setQrCodeText(pixText);

      // Salvar order no banco com a data referente ao mês selecionado
      if (data.order_id) {
        const targetDate = new Date();
        targetDate.setMonth(selectedMonth!);
        targetDate.setDate(15);

        const { data: newOrder } = await supabase.from('orders').insert({
          tenant_id: gym.id,
          student_id: student.id,
          gateway_id: data.order_id,
          amount: amountInCents,
          status: 'pending',
          payment_method: 'pix',
          created_at: targetDate.toISOString()
        }).select().single();

        if (newOrder) {
          setOrders([newOrder, ...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao gerar PIX");
    } finally {
      setLoadingPix(false);
    }
  };

  const generatePaymentLink = async () => {
    if (!student || !gym) return;
    setLoadingLink(true);
    setCheckoutError(null);
    try {
      const payload = {
        amountInCents: gym.monthly_fee_cents || 15000,
        gym_recipient_id: gym.pagarme_recipient_id,
        student_id: student.id,
        gym_id: gym.id
      };

      const { data, error } = await supabase.functions.invoke('pagarme-subscription', { body: payload });
      if (error) throw new Error("Falha na rede ao conectar com o servidor.");
      if (data?.success === false) throw new Error(`Pagar.me recusou: ${data.error?.message || JSON.stringify(data.error)}`);
      if (data?.error) throw new Error(JSON.stringify(data.error));
      if (!data.url) throw new Error("A Pagar.me não retornou a URL de pagamento.");

      setPaymentLinkUrl(data.url);
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao gerar Link");
    } finally {
      setLoadingLink(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed': case 'late': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-surface-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  const annualControl = student ? getAnnualControl() : [];
  const lateCount = annualControl.filter(m => m.status === 'late').length;
  const paidCount = annualControl.filter(m => m.status === 'paid').length;
  const isCompleted = qrCodeUrl || paymentLinkUrl;
  const isLoading = loadingPix || loadingLink;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-surface-500">Acompanhe suas mensalidades e realize pagamentos.</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-5 text-center">
          <p className="text-sm text-surface-500 font-medium">Meses Pagos</p>
          <p className="text-3xl font-black text-green-600 mt-1">{paidCount}</p>
        </div>
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-5 text-center">
          <p className="text-sm text-surface-500 font-medium">Meses em Atraso</p>
          <p className="text-3xl font-black text-red-600 mt-1">{lateCount}</p>
        </div>
        <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-5 text-center">
          <p className="text-sm text-surface-500 font-medium">Mensalidade</p>
          <p className="text-3xl font-black text-primary-600 mt-1">
            R$ {((gym?.monthly_fee_cents || 15000) / 100).toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* Alerta de atraso */}
      {lateCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Você tem {lateCount} {lateCount === 1 ? 'mensalidade atrasada' : 'mensalidades atrasadas'}.</p>
            <p className="text-xs text-red-600 mt-0.5">Clique no mês em atraso abaixo para regularizar.</p>
          </div>
        </div>
      )}

      {/* Mapa Anual */}
      <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-surface-900">Controle Anual ({new Date().getFullYear()})</h3>
          <p className="text-sm text-surface-500">Clique em um mês pendente ou atrasado para pagar.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {annualControl.map((month) => {
            let bgColor = 'bg-surface-100 border-surface-200';
            let textColor = 'text-surface-400';
            let label = 'Inativo';
            let canPay = false;

            if (month.status === 'paid') {
              bgColor = 'bg-green-50 border-green-200';
              textColor = 'text-green-700';
              label = '✓ Pago';
            } else if (month.status === 'late') {
              bgColor = 'bg-red-50 border-red-200';
              textColor = 'text-red-700';
              label = 'Atrasado';
              canPay = true;
            } else if (month.status === 'pending') {
              bgColor = 'bg-yellow-50 border-yellow-200';
              textColor = 'text-yellow-700';
              label = 'Aguardando';
            } else if (month.status === 'current') {
              bgColor = 'bg-primary-50 border-primary-200';
              textColor = 'text-primary-700';
              label = 'Mês Atual';
              canPay = true;
            } else if (month.status === 'upcoming') {
              bgColor = 'bg-surface-50 border-surface-200';
              textColor = 'text-surface-500';
              label = 'A Vencer';
            }

            return (
              <div
                key={month.index}
                className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${bgColor} ${canPay ? 'cursor-pointer hover:shadow-md hover:scale-[1.03] active:scale-[0.98]' : ''}`}
                onClick={canPay ? () => openCheckoutForMonth(month.index) : undefined}
              >
                <span className={`text-lg font-bold uppercase ${textColor}`}>{month.name}</span>
                <span className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full bg-white/50 ${textColor}`}>{label}</span>
                {canPay && (
                  <span className="mt-2 text-[10px] font-bold text-white bg-primary-600 px-2.5 py-1 rounded-full">
                    Pagar
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 bg-surface-50">
          <h2 className="text-lg font-bold text-surface-900">Histórico de Pagamentos</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                    Nenhuma cobrança registrada.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const orderDate = new Date(order.created_at);
                  const monthLabel = monthFullNames[orderDate.getMonth()];
                  return (
                    <tr key={order.id} className="hover:bg-surface-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        {orderDate.toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-900">
                        <span className="font-medium">Mensalidade — {monthLabel}</span>
                        <span className="block text-xs text-surface-400 font-mono mt-0.5">{order.id.split('-')[0]}...</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">
                        R$ {(order.amount / 100).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="text-sm font-medium capitalize text-surface-700">
                            {order.status === 'paid' ? 'Pago' : order.status === 'pending' ? 'Pendente' : order.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Checkout */}
      {isCheckoutOpen && selectedMonth !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-surface-200">
              <div className="flex items-center gap-2 text-primary-600">
                <QrCode className="h-5 w-5" />
                <h3 className="font-semibold text-surface-900">Pagar Mensalidade</h3>
              </div>
              <button onClick={closeCheckout} className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-surface-500">Referência</p>
                <p className="text-lg font-bold text-surface-900">{monthFullNames[selectedMonth]} / {new Date().getFullYear()}</p>
                <p className="text-2xl font-black text-primary-600 mt-2">
                  R$ {((gym?.monthly_fee_cents || 15000) / 100).toFixed(2).replace('.', ',')}
                </p>
              </div>

              {checkoutError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                  {checkoutError}
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
                      <><Loader2 className="animate-spin h-5 w-5" /> Gerando PIX...</>
                    ) : (
                      <><QrCode className="h-5 w-5" /> Pagar com PIX</>
                    )}
                  </button>
                  
                  <button
                    onClick={generatePaymentLink}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-surface-900 hover:bg-surface-800 text-white rounded-lg font-semibold transition-all disabled:opacity-70"
                  >
                    {loadingLink ? (
                      <><Loader2 className="animate-spin h-5 w-5" /> Gerando Link...</>
                    ) : (
                      <><CreditCard className="h-5 w-5" /> Assinar no Cartão (Recorrência)</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center justify-center gap-2 border border-green-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Cobrança Gerada!</span>
                  </div>

                  {qrCodeUrl && (
                    <div className="flex justify-center p-4 bg-surface-50 rounded-lg border border-surface-200">
                      <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48" />
                    </div>
                  )}

                  {qrCodeText && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Pix Copia e Cola</p>
                      <div className="flex gap-2">
                        <input readOnly value={qrCodeText} className="flex-1 text-xs p-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 focus:outline-none" />
                        <button 
                          onClick={() => navigator.clipboard.writeText(qrCodeText)}
                          className="px-3 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentLinkUrl && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 mb-1 uppercase tracking-wider">Link de Pagamento</p>
                      <div className="flex gap-2">
                        <input readOnly value={paymentLinkUrl} className="flex-1 text-xs p-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 focus:outline-none" />
                        <button 
                          onClick={() => navigator.clipboard.writeText(paymentLinkUrl)}
                          className="px-3 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <LinkIcon className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                      <a 
                        href={paymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold transition-all text-sm"
                      >
                        <CreditCard className="h-4 w-4" /> Ir para Pagamento
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
