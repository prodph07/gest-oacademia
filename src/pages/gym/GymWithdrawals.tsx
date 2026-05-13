import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, Clock, Loader2, AlertCircle, CheckCircle, Banknote } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function GymWithdrawals() {
  const [loading, setLoading] = useState(true);
  const [gymData, setGymData] = useState<any>(null);

  // Balance
  const [availableAmount, setAvailableAmount] = useState(0);
  const [waitingFunds, setWaitingFunds] = useState(0);
  const [transferredAmount, setTransferredAmount] = useState(0);

  // Withdrawals list
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Withdraw modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
        .select('id, name, pagarme_recipient_id')
        .eq('admin_user_id', userData.user.id)
        .single();

      if (!gym || !gym.pagarme_recipient_id) {
        setGymData(gym);
        setLoading(false);
        return;
      }
      setGymData(gym);

      // Fetch balance
      const { data: balanceData, error: balanceError } = await supabase.functions.invoke('pagarme-balance', {
        body: { action: 'balance', recipient_id: gym.pagarme_recipient_id }
      });

      if (!balanceError && balanceData) {
        setAvailableAmount(balanceData.available_amount || 0);
        setWaitingFunds(balanceData.waiting_funds_amount || 0);
        setTransferredAmount(balanceData.transferred_amount || 0);
      }

      // Fetch withdrawal history
      const { data: listData, error: listError } = await supabase.functions.invoke('pagarme-balance', {
        body: { action: 'list', recipient_id: gym.pagarme_recipient_id }
      });

      if (!listError && listData?.withdrawals) {
        setWithdrawals(listData.withdrawals);
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!gymData?.pagarme_recipient_id) return;
    const amountInCents = Math.round(parseFloat(withdrawAmount) * 100);

    if (isNaN(amountInCents) || amountInCents <= 0) {
      setMessage({ text: 'Informe um valor válido.', type: 'error' });
      return;
    }

    if (amountInCents > availableAmount) {
      setMessage({ text: 'Valor solicitado é maior que o saldo disponível.', type: 'error' });
      return;
    }

    setWithdrawing(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('pagarme-balance', {
        body: {
          action: 'withdraw',
          recipient_id: gymData.pagarme_recipient_id,
          amount: amountInCents
        }
      });

      if (error) throw new Error("Falha na comunicação com o servidor.");
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

      setMessage({ text: `Saque de R$ ${withdrawAmount} solicitado com sucesso! Status: ${data.status}`, type: 'success' });
      setIsModalOpen(false);
      setWithdrawAmount('');

      // Refresh data
      await fetchData();

    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao solicitar saque.', type: 'error' });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const getWithdrawStatusLabel = (status: string) => {
    switch (status) {
      case 'transferred': return { label: 'Transferido', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
      case 'pending': case 'processing': return { label: 'Processando', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4 text-yellow-500" /> };
      case 'failed': return { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-4 w-4 text-red-500" /> };
      default: return { label: status, color: 'bg-surface-100 text-surface-800', icon: <Clock className="h-4 w-4 text-surface-500" /> };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!gymData?.pagarme_recipient_id) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight mb-4">Saques</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-yellow-800 mb-2">Configuração necessária</h3>
          <p className="text-sm text-yellow-700">
            Você precisa configurar o seu <strong>Pagar.me Recipient ID</strong> nas Configurações antes de poder realizar saques.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Saques</h1>
        <p className="mt-1 text-sm text-surface-500">Gerencie os saques do saldo disponível da sua academia.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Cards de Saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-100 text-green-700 rounded-lg">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-surface-500">Disponível para Saque</p>
          </div>
          <p className="text-3xl font-black text-green-700">{formatCurrency(availableAmount)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-yellow-100 text-yellow-700 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-surface-500">A Liberar</p>
          </div>
          <p className="text-3xl font-black text-yellow-700">{formatCurrency(waitingFunds)}</p>
          <p className="text-xs text-surface-400 mt-1">Valores ainda em período de antecipação</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-primary-100 text-primary-700 rounded-lg">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-surface-500">Total Sacado</p>
          </div>
          <p className="text-3xl font-black text-primary-700">{formatCurrency(transferredAmount)}</p>
        </div>
      </div>

      {/* Botão de Saque */}
      <div className="bg-white border border-surface-200 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-surface-900">Solicitar Saque</h3>
          <p className="text-sm text-surface-500">O valor será transferido para a conta bancária cadastrada na Pagar.me.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setMessage(null); }}
          disabled={availableAmount <= 0}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Banknote className="h-5 w-5" />
          Sacar Agora
        </button>
      </div>

      {/* Histórico de Saques */}
      <div className="bg-white shadow-sm rounded-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 bg-surface-50/50">
          <h3 className="text-lg font-bold text-surface-900">Histórico de Saques</h3>
        </div>
        <div className="overflow-x-auto min-h-[150px]">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                    Nenhum saque realizado ainda.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w: any) => {
                  const statusInfo = getWithdrawStatusLabel(w.status);
                  return (
                    <tr key={w.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-600 font-mono">
                        {w.id?.substring(0, 12)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-surface-900">
                        {formatCurrency(w.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Saque */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto h-14 w-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Banknote className="h-7 w-7 text-green-700" />
                </div>
                <h3 className="text-lg font-bold text-surface-900">Solicitar Saque</h3>
                <p className="text-sm text-surface-500 mt-1">
                  Saldo disponível: <span className="font-bold text-green-700">{formatCurrency(availableAmount)}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-surface-700 mb-2">Valor do Saque (R$)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-surface-500 text-sm font-medium">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={(availableAmount / 100)}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-lg text-surface-900 text-lg font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount((availableAmount / 100).toFixed(2))}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Sacar tudo ({formatCurrency(availableAmount)})
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsModalOpen(false); setWithdrawAmount(''); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {withdrawing ? (
                    <><Loader2 className="animate-spin h-4 w-4" /> Processando...</>
                  ) : (
                    'Confirmar Saque'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
