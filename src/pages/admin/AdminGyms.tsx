import { useState, useEffect } from 'react';
import { Building2, Search, MoreVertical, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Gym {
  id: string;
  name: string;
  cnpj: string;
  pagarme_recipient_id: string | null;
  created_at: string;
}

export default function AdminGyms() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGyms(data || []);
    } catch (error) {
      console.error('Erro ao buscar academias:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGyms = gyms.filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    gym.cnpj.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Academias (Tenants)</h1>
          <p className="text-sm text-surface-500 mt-1">Gerencie todos os clientes ativos na sua plataforma.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-surface-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-surface-900 ring-1 ring-inset ring-surface-300 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Academia</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">CNPJ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Onboarding Pagar.me</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Cadastro</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500" />
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredGyms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-surface-500">
                    Nenhuma academia encontrada.
                  </td>
                </tr>
              ) : (
                filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700">
                            <Building2 className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-surface-900">{gym.name}</div>
                          <div className="text-xs text-surface-500">ID: {gym.id.split('-')[0]}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600">
                      {gym.cnpj}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {gym.pagarme_recipient_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <AlertCircle className="h-3.5 w-3.5" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                      {new Date(gym.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-full hover:bg-surface-100">
                        <MoreVertical className="h-5 w-5" />
                      </button>
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
