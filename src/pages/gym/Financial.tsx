import { useState, useEffect } from 'react';
import { DollarSign, ArrowDownRight, ArrowUpRight, FileText, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

interface Transaction {
  id: string;
  student: string;
  date: string;
  amount: string;
  status: string;
  method: string;
  fee: string;
}

export default function Financial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState({
    received: 0,
    pending: 0,
    late: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('admin_user_id', userData.user.id)
        .single();
      
      if (!gym) return;

      // Fetch real transactions
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          amount,
          status,
          payment_method,
          created_at,
          students ( name )
        `)
        .eq('tenant_id', gym.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (ordersData) {
        let received = 0;
        let pending = 0;
        let late = 0;

        const formatted = ordersData.map(order => {
          const amt = Number(order.amount) || 0;
          if (order.status === 'paid') received += amt;
          else if (order.status === 'pending') pending += amt;
          else if (order.status === 'late') late += amt;

          return {
            id: order.id,
            student: (order.students as any)?.name || 'Aluno Excluído',
            date: new Date(order.created_at).toLocaleDateString('pt-BR'),
            amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amt / 100),
            status: order.status || 'pending',
            method: order.payment_method?.toUpperCase() || 'N/A',
            fee: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((amt * 0.02) / 100) // Taxa de 2%
          };
        });
        
        setMetrics({
          received: received / 100,
          pending: pending / 100,
          late: late / 100
        });
        setTransactions(formatted);
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-surface-500">Acompanhe seus recebíveis e status de faturas.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500">Recebido (Mês)</p>
            <p className="text-2xl font-bold text-surface-900">{formatCurrency(metrics.received)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500">A Receber (Previsto)</p>
            <p className="text-2xl font-bold text-surface-900">{formatCurrency(metrics.pending)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-500">Inadimplência</p>
            <p className="text-2xl font-bold text-surface-900">{formatCurrency(metrics.late)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 flex justify-between items-center bg-surface-50/50">
          <h3 className="text-lg leading-6 font-medium text-surface-900">Histórico de Transações</h3>
          <button className="inline-flex items-center px-3 py-1.5 border border-surface-300 text-sm font-medium rounded-lg text-surface-700 bg-white hover:bg-surface-50 transition-colors">
            <FileText className="mr-2 h-4 w-4 text-surface-500" />
            Exportar
          </button>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Aluno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Valor Líquido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Método</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500" />
                    Buscando transações...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    Nenhuma transação encontrada no banco de dados.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">{tx.student}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{tx.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-surface-900">{tx.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900">{tx.method}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                        tx.status === 'paid' && "bg-green-100 text-green-800",
                        tx.status === 'pending' && "bg-yellow-100 text-yellow-800",
                        tx.status === 'late' && "bg-red-100 text-red-800",
                        tx.status === 'failed' && "bg-gray-100 text-gray-800"
                      )}>
                        {tx.status === 'paid' ? 'Pago' : tx.status === 'pending' ? 'Pendente' : tx.status === 'failed' ? 'Falhou' : 'Atrasado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
