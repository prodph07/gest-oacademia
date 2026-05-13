import { useState, useEffect } from 'react';
import { Building2, CreditCard, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

interface GymStats {
  id: string;
  name: string;
  students: number;
  volume: number;
  status: string;
  onboarded: boolean;
}

export default function MasterDashboard() {
  const [gyms, setGyms] = useState<GymStats[]>([]);
  const [globalVolume, setGlobalVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      // O Master deve ter uma policy RLS que permita ler tudo (auth.jwt()->>'email' = 'master@saas.com')
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name, pagarme_recipient_id');
      
      if (gymsError) throw gymsError;

      if (gymsData) {
        let totalVol = 0;
        const statsPromises = gymsData.map(async (gym) => {
          // Count students
          const { count: studentsCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', gym.id);

          // Sum orders
          const { data: orders } = await supabase
            .from('orders')
            .select('amount')
            .eq('tenant_id', gym.id)
            .eq('status', 'paid');
            
          const volumeCents = orders?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
          totalVol += volumeCents;

          return {
            id: gym.id,
            name: gym.name,
            students: studentsCount || 0,
            volume: volumeCents / 100,
            status: 'active',
            onboarded: !!gym.pagarme_recipient_id
          };
        });

        const stats = await Promise.all(statsPromises);
        setGyms(stats);
        setGlobalVolume(totalVol / 100);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do master:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const masterFee = globalVolume * 0.02;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Visão Global da Plataforma</h1>
        <p className="mt-1 text-sm text-surface-500">Métricas de performance de todas as academias e receita do SaaS.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Academias Ativas</p>
              <p className="mt-2 text-3xl font-bold text-surface-900">{gyms.length}</p>
            </div>
            <div className="p-3 bg-surface-100 rounded-lg text-surface-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-500">Volume Total Transacionado</p>
              <p className="mt-2 text-3xl font-bold text-surface-900">{formatCurrency(globalVolume)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-sm text-surface-500">
            Soma de todas as mensalidades processadas.
          </div>
        </div>

        <div className="bg-surface-900 p-6 rounded-xl border border-surface-800 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-surface-400">Receita do SaaS (2% Fee)</p>
              <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(masterFee)}</p>
            </div>
            <div className="p-3 bg-primary-600 rounded-lg text-white">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 text-sm text-surface-400">
            Seu lucro limpo já faturado.
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-surface-900">Academias Cadastradas</h3>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Academia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Alunos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Volume (Mês)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Pagar.me Onboarding</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500" />
                    Buscando dados das franquias...
                  </td>
                </tr>
              ) : gyms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    Nenhuma academia encontrada. Verifique as Policies do Supabase.
                  </td>
                </tr>
              ) : (
                gyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-surface-900">{gym.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{gym.students}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{formatCurrency(gym.volume)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gym.onboarded ? (
                        <span className="inline-flex items-center text-sm text-green-700">
                          <CheckCircle className="mr-1.5 h-4 w-4 text-green-500" />
                          Recebedor Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-sm text-yellow-700">
                          <Clock className="mr-1.5 h-4 w-4 text-yellow-500" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                        gym.status === 'active' ? "bg-green-100 text-green-800" : "bg-surface-100 text-surface-800"
                      )}>
                        {gym.status === 'active' ? 'Operando' : 'Setup'}
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
