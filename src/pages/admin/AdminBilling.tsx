import { useState, useEffect } from 'react';
import { ArrowUpRight, Wallet, Download, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MasterTransaction {
  id: string;
  gym: string;
  amount: string;
  date: string;
  status: string;
}

export default function AdminBilling() {
  const [globalVolume, setGlobalVolume] = useState(0);
  const [transactions, setTransactions] = useState<MasterTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name');
      
      if (gymsError) throw gymsError;

      if (gymsData) {
        let totalVol = 0;
        let allTransactions: MasterTransaction[] = [];

        for (const gym of gymsData) {
          const { data: orders } = await supabase
            .from('orders')
            .select('id, amount, created_at, status')
            .eq('tenant_id', gym.id)
            .eq('status', 'paid')
            .order('created_at', { ascending: false });

          if (orders) {
            const gymVol = orders.reduce((acc, curr) => acc + Number(curr.amount), 0);
            totalVol += gymVol;

            orders.forEach(order => {
              allTransactions.push({
                id: order.id,
                gym: gym.name,
                amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(order.amount) * 0.02) / 100), // 2% comissão
                date: new Date(order.created_at).toLocaleDateString('pt-BR'),
                status: 'completed'
              });
            });
          }
        }

        setGlobalVolume(totalVol / 100);
        // Sort transactions globally by date desc
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(allTransactions);
      }
    } catch (error) {
      console.error('Erro ao buscar billing do master:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const masterFee = globalVolume * 0.02;

  const metrics = [
    { name: 'Receita Total (2%)', value: formatCurrency(masterFee), change: '+0%', trend: 'up' },
    { name: 'Volume Transacionado (GMV)', value: formatCurrency(globalVolume), change: '+0%', trend: 'up' },
    { name: 'Ticket Médio SaaS', value: formatCurrency(masterFee > 0 && transactions.length > 0 ? masterFee / transactions.length : 0), change: '+0%', trend: 'up' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Faturamento da Plataforma</h1>
          <p className="text-sm text-surface-500 mt-1">Acompanhe seus rendimentos vindos da taxa de comissão de 2%.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface-300 hover:bg-surface-50 text-surface-700 text-sm font-medium rounded-lg transition-colors">
            <Calendar className="h-4 w-4" />
            Este Mês
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
            <Download className="h-4 w-4" />
            Exportar Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-surface-500">{metric.name}</p>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                {metric.change}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-surface-900 tracking-tight">{metric.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-6 border-b border-surface-200">
          <h2 className="text-lg font-bold text-surface-900">Extrato de Repasses (Comissão)</h2>
        </div>
        <div className="divide-y divide-surface-100 min-h-[200px]">
          {loading ? (
            <div className="p-10 flex justify-center text-surface-500">
              <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
            </div>
          ) : transactions.length === 0 ? (
             <div className="p-10 text-center text-surface-500">
               Nenhum repasse registrado ainda.
             </div>
          ) : transactions.map((t) => (
            <div key={t.id} className="p-6 flex items-center justify-between hover:bg-surface-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">{t.gym}</p>
                  <p className="text-sm text-surface-500">{t.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">+{t.amount}</p>
                <p className="text-xs text-surface-400">Sucesso</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
