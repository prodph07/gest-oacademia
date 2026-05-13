import { useState, useEffect } from 'react';
import { Save, Building2, Key, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function GymSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    cnpj: '',
    pagarme_recipient_id: '',
    monthly_fee_cents: 15000
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: gym } = await supabase
        .from('gyms')
        .select('id, name, cnpj, pagarme_recipient_id, monthly_fee_cents')
        .eq('admin_user_id', userData.user.id)
        .single();
      
      if (gym) {
        setFormData({
          id: gym.id || '',
          name: gym.name || '',
          cnpj: gym.cnpj || '',
          pagarme_recipient_id: gym.pagarme_recipient_id || '',
          monthly_fee_cents: gym.monthly_fee_cents || 15000
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('gyms')
        .update({
          name: formData.name,
          cnpj: formData.cnpj,
          pagarme_recipient_id: formData.pagarme_recipient_id,
          monthly_fee_cents: formData.monthly_fee_cents
        })
        .eq('admin_user_id', userData.user.id);

      if (error) throw error;

      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setMessage({ text: 'Erro ao salvar: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
      
      // Limpa mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Configurações da Academia</h1>
        <p className="mt-1 text-sm text-surface-500">Gerencie as informações do seu negócio e integrações de pagamento.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary-600" />
              Dados da Empresa
            </h2>

            <div className="mb-8 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
                Link de Cadastro de Alunos
              </h3>
              <p className="text-sm text-blue-700 mb-3">Compartilhe este link com seus alunos para que eles mesmos criem suas contas e acessem o Portal do Aluno da sua academia.</p>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={`${window.location.origin}/invite/${formData.id}`} 
                  className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-surface-600 font-mono focus:outline-none"
                />
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/invite/${formData.id}`);
                    alert('Link copiado!');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Copiar Link
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Nome Fantasia da Academia</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 mb-1">Valor Padrão da Mensalidade (R$)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-surface-500 sm:text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData.monthly_fee_cents / 100).toFixed(2)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setFormData({ ...formData, monthly_fee_cents: Math.round(val * 100) });
                      }
                    }}
                    className="w-full pl-10 px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-surface-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-surface-500">Este valor será sugerido automaticamente ao cobrar um novo aluno.</p>
              </div>
            </div>
          </div>

          <hr className="border-surface-200" />

          <div>
            <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary-600" />
              Integração Financeira (Pagar.me)
            </h2>
            <div className="bg-surface-50 p-4 rounded-lg border border-surface-200 mb-4">
              <p className="text-sm text-surface-600">
                O <strong>Recipient ID</strong> é a chave da sua conta Pagar.me que permite que o dinheiro dos seus alunos caia diretamente na sua conta bancária (com o split automático já descontado).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Pagar.me Recipient ID (Recebedor)</label>
              <input
                type="text"
                name="pagarme_recipient_id"
                value={formData.pagarme_recipient_id}
                onChange={handleChange}
                placeholder="re_xxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 bg-white border border-surface-300 rounded-lg text-surface-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-surface-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
