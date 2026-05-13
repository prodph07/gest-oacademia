import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Dumbbell, Loader2 } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gymName: '',
    cnpj: '',
    bankCode: '',
    branchNumber: '',
    accountNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(step + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.name }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Chamar Edge Function de Onboarding (Pagar.me)
        const { data: pagarmeData, error: pagarmeError } = await supabase.functions.invoke('pagarme-onboarding', {
          body: {
            name: formData.gymName,
            email: formData.email,
            document: formData.cnpj.replace(/\D/g, ''),
            default_bank_account: {
              holder_name: formData.gymName,
              bank: formData.bankCode,
              branch_number: formData.branchNumber.slice(0, -1) || '0000',
              branch_check_digit: formData.branchNumber.slice(-1) || '0',
              account_number: formData.accountNumber.slice(0, -1) || '00000',
              account_check_digit: formData.accountNumber.slice(-1) || '0',
              type: 'checking'
            }
          }
        });

        if (pagarmeError) {
          throw new Error("Erro na integração com gateway de pagamento.");
        }

        if (pagarmeData?.error) {
          throw new Error(JSON.stringify(pagarmeData.error));
        }

        const recipientId = pagarmeData?.recipient_id;

        // 3. Criar a Academia (Tenant) vinculada
        const { error: gymError } = await supabase
          .from('gyms')
          .insert([
            {
              name: formData.gymName,
              cnpj: formData.cnpj,
              admin_user_id: authData.user.id,
              pagarme_recipient_id: recipientId
            }
          ]);

        if (gymError) throw gymError;

        navigate('/gym/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-primary-600 p-2 rounded-lg">
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-surface-900">GymFlow</span>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-surface-900">Comece agora</h2>
        <p className="mt-2 text-sm text-surface-500">
          Já possui conta?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            Faça login
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <form onSubmit={step < 3 ? handleNext : handleRegister} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 max-h-40 overflow-y-auto">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-surface-900">Seu Nome Completo</label>
                <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-900">E-mail Profissional</label>
                <input name="email" type="email" required value={formData.email} onChange={handleChange} className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-900">Senha</label>
                <input name="password" type="password" required value={formData.password} onChange={handleChange} className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <button type="submit" className="flex w-full justify-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-all">Próximo Passo</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-surface-900">Nome da Academia</label>
                <input name="gymName" type="text" required value={formData.gymName} onChange={handleChange} className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-900">CNPJ ou CPF</label>
                <input name="cnpj" type="text" required value={formData.cnpj} onChange={handleChange} className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="flex flex-1 justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-surface-700 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 transition-all">Voltar</button>
                <button type="submit" className="flex flex-1 justify-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-all">Continuar</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-sm font-medium text-surface-900">Código do Banco (Ex: 341 - Itaú)</label>
                <input name="bankCode" type="text" required value={formData.bankCode} onChange={handleChange} placeholder="Ex: 341" className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-surface-900">Agência com Dígito</label>
                  <input name="branchNumber" type="text" required value={formData.branchNumber} onChange={handleChange} placeholder="Ex: 12341" className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-surface-900">Conta com Dígito</label>
                  <input name="accountNumber" type="text" required value={formData.accountNumber} onChange={handleChange} placeholder="Ex: 123451" className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm" />
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(2)} className="flex flex-1 justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-surface-700 shadow-sm ring-1 ring-inset ring-surface-300 hover:bg-surface-50 transition-all">Voltar</button>
                <button type="submit" disabled={loading} className="flex flex-1 justify-center items-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-70 transition-all">
                  {loading ? <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Finalizando...</> : 'Concluir Cadastro'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
