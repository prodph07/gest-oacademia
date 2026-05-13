import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Phone, Calendar, CreditCard, Loader2, ShieldCheck, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};
import CheckoutModal from '../../components/payment/CheckoutModal';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [gymData, setGymData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchStudentProfile();
  }, [id]);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: gym } = await supabase
        .from('gyms')
        .select('id, pagarme_recipient_id, monthly_fee_cents')
        .eq('admin_user_id', userData.user.id)
        .single();
      
      if (!gym) return;
      setGymData(gym);

      // Busca dados do aluno
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', gym.id)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Busca histórico de ordens (pagamentos)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (error) {
      console.error('Erro ao buscar perfil do aluno:', error);
    } finally {
      setLoading(false);
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

  const getAnnualControl = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    let enrollmentMonth = 0;
    let enrollmentYear = currentYear;
    
    if (student?.enrollment_date) {
      const d = new Date(student.enrollment_date);
      enrollmentMonth = d.getUTCMonth();
      enrollmentYear = d.getUTCFullYear();
    }

    return months.map((monthName, index) => {
      // Se for um ano anterior ao da matrícula
      if (currentYear < enrollmentYear) return { name: monthName, status: 'inactive' };
      // Se for o mesmo ano, mas o mês é antes da matrícula
      if (currentYear === enrollmentYear && index < enrollmentMonth) return { name: monthName, status: 'inactive' };

      // Procurar se existe alguma fatura (order) criada neste mês
      const orderInMonth = orders.find(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === index && orderDate.getFullYear() === currentYear;
      });

      if (orderInMonth) {
        if (orderInMonth.status === 'paid') return { name: monthName, status: 'paid', orderId: orderInMonth.id };
        if (orderInMonth.status === 'pending') return { name: monthName, status: 'pending', orderId: orderInMonth.id };
      }

      // Se não tem fatura
      if (index < currentMonth) return { name: monthName, status: 'late' };
      if (index === currentMonth) return { name: monthName, status: 'pending' }; // Mês atual sem fatura fica pendente
      return { name: monthName, status: 'upcoming' };
    });
  };

  const handleManualPayment = async (monthIndex: number) => {
    if (!window.confirm("Registrar pagamento em dinheiro para este mês? Uma fatura será gerada como 'Paga'.")) return;
    try {
      const targetDate = new Date();
      targetDate.setMonth(monthIndex);
      targetDate.setDate(15); // Dia 15 como padrão para faturas retroativas

      const { data, error } = await supabase
        .from('orders')
        .insert([{
          tenant_id: gymData.id,
          student_id: student.id,
          amount: gymData.monthly_fee_cents || 15000,
          status: 'paid',
          payment_method: 'manual',
          created_at: targetDate.toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      setOrders([data, ...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Erro ao registrar pagamento manual:', error);
      alert('Erro ao registrar pagamento manual.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-surface-900">Aluno não encontrado</h2>
        <button onClick={() => navigate('/gym/students')} className="mt-4 text-primary-600 hover:text-primary-700 font-medium">Voltar para alunos</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/gym/students')} className="p-2 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-surface-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Perfil do Aluno</h1>
          <p className="text-sm text-surface-500">Detalhes cadastrais e histórico financeiro</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Dados do Aluno */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-primary-600 p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-primary-600 shadow-md mb-4">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white">{student.name}</h2>
              <span className={cn(
                "mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm"
              )}>
                {student.payment_status === 'paid' ? 'Mensalidade em dia' : student.payment_status === 'pending' ? 'Pagamento Pendente' : 'Mensalidade Atrasada'}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-surface-700">
                <FileText className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-500">Documento (CPF/RG)</p>
                  <p className="text-sm font-medium">{student.document || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-surface-700">
                <Phone className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-500">Telefone</p>
                  <p className="text-sm font-medium">{student.phone || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-surface-700">
                <Calendar className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-500">Data de Nascimento</p>
                  <p className="text-sm font-medium">
                    {student.birth_date ? new Date(student.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado'}
                  </p>
                </div>
              </div>

              <hr className="border-surface-100" />

              <div>
                <p className="text-xs text-surface-500 mb-1">Modalidade / Faixa</p>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-surface-100 text-surface-700 text-xs font-semibold rounded-md border border-surface-200">{student.modality || 'Indefinida'}</span>
                  {student.belt_rank && (
                    <span className="px-2.5 py-1 bg-surface-100 text-surface-700 text-xs font-semibold rounded-md border border-surface-200">{student.belt_rank}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Responsável (se houver) */}
          {(student.guardian_name || student.guardian_phone) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-sm overflow-hidden p-6">
              <h3 className="text-orange-800 font-bold flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5" />
                Dados do Responsável
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-orange-600/80">Nome Completo</p>
                  <p className="text-sm font-medium text-orange-900">{student.guardian_name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-xs text-orange-600/80">Contato (Telefone/WhatsApp)</p>
                  <p className="text-sm font-medium text-orange-900">{student.guardian_phone || 'Não informado'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Ações e Log Financeiro */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-surface-900">Ações Financeiras</h3>
              <p className="text-sm text-surface-500">Gere cobranças ou links de assinatura para este aluno.</p>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Cobrar Aluno
            </button>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-200">
              <h3 className="text-lg font-bold text-surface-900">Histórico Financeiro</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-200">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Descrição / ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-surface-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                        Nenhuma cobrança gerada para este aluno ainda.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-900">
                          <span className="font-medium">Mensalidade</span>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa Anual */}
      <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-surface-900">Controle Anual ({new Date().getFullYear()})</h3>
          <p className="text-sm text-surface-500">Mapeamento de mensalidades com base na data de entrada ({student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informada'}) e histórico.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {getAnnualControl().map((month, idx) => {
            let bgColor = 'bg-surface-100 border-surface-200';
            let textColor = 'text-surface-400';
            let label = 'Inativo';
            let showButton = false;

            if (month.status === 'paid') {
              bgColor = 'bg-green-50 border-green-200';
              textColor = 'text-green-700';
              label = 'Pago';
            } else if (month.status === 'late') {
              bgColor = 'bg-red-50 border-red-200';
              textColor = 'text-red-700';
              label = 'Atrasado';
              showButton = true;
            } else if (month.status === 'pending') {
              bgColor = 'bg-yellow-50 border-yellow-200';
              textColor = 'text-yellow-700';
              label = 'Pendente';
              showButton = true;
            } else if (month.status === 'upcoming') {
              bgColor = 'bg-surface-50 border-surface-200';
              textColor = 'text-surface-500';
              label = 'A Vencer';
            }

            return (
              <div key={idx} className={cn("border rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all", bgColor)}>
                <span className={cn("text-lg font-bold uppercase", textColor)}>{month.name}</span>
                <span className={cn("text-xs font-semibold mt-1 px-2 py-0.5 rounded-full bg-white/50", textColor)}>{label}</span>
                {showButton && (
                  <button 
                    onClick={() => handleManualPayment(idx)}
                    className="mt-3 text-[10px] font-bold text-white bg-surface-900 hover:bg-surface-800 px-2 py-1 rounded w-full transition-colors"
                  >
                    Baixa Manual
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isCheckoutOpen && gymData && (
        <CheckoutModal 
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          student={student}
          gymRecipientId={gymData.pagarme_recipient_id}
          gymId={gymData.id}
          amountInCents={gymData.monthly_fee_cents || 15000}
        />
      )}
    </div>
  );
}
