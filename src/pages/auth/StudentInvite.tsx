import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, AlertCircle, Dumbbell } from 'lucide-react';

export default function StudentInvite() {
  const { gymId } = useParams();
  const navigate = useNavigate();
  
  const [gym, setGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    document: '',
    password: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchGym = async () => {
      try {
        const { data, error } = await supabase
          .from('gyms')
          .select('id, name')
          .eq('id', gymId)
          .single();
        
        if (error) throw error;
        setGym(data);
      } catch (err) {
        console.error('Erro ao buscar academia:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (gymId) fetchGym();
  }, [gymId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário.');

      const userId = authData.user.id;

      // 2. Procurar se já existe um aluno com este documento na academia
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('tenant_id', gymId)
        .eq('document', formData.document)
        .maybeSingle();

      if (existingStudent) {
        // 3a. Se existe, apenas atualiza vinculando o auth_user_id e email
        const { error: updateError } = await supabase
          .from('students')
          .update({
            auth_user_id: userId,
            email: formData.email
          })
          .eq('id', existingStudent.id);
          
        if (updateError) throw updateError;
      } else {
        // 3b. Se não existe, insere um novo aluno
        const { error: insertError } = await supabase
          .from('students')
          .insert([{
            tenant_id: gymId,
            auth_user_id: userId,
            name: formData.name,
            document: formData.document,
            email: formData.email,
            payment_status: 'pending'
          }]);
          
        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-surface-900 mb-2">Link Inválido</h2>
          <p className="text-surface-500 max-w-md">Não foi possível encontrar a academia referente a este convite. Solicite um novo link ao seu instrutor.</p>
          <Link to="/login" className="mt-6 inline-block text-primary-600 font-semibold hover:text-primary-700">Ir para o Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-primary-600 p-8 text-center text-white">
          <div className="mx-auto bg-white/20 h-16 w-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Portal do Aluno</h1>
          <p className="text-primary-100 font-medium">Você está se cadastrando na academia:</p>
          <p className="text-lg font-bold mt-1 bg-white/10 py-1 px-4 rounded-full inline-block">{gym.name}</p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-surface-900 mb-2">Cadastro concluído!</h3>
              <p className="text-surface-500">Sua conta foi criada e vinculada com sucesso.</p>
              <p className="text-sm text-surface-400 mt-4">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-100">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-900 mb-1">Nome Completo</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900 mb-1">E-mail</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900 mb-1">CPF</label>
                  <input
                    required
                    type="text"
                    value={formData.document}
                    onChange={e => setFormData({ ...formData, document: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Apenas números. Ex: 12345678900"
                  />
                  <p className="text-xs text-surface-400 mt-1">Usaremos o CPF para vincular a um cadastro existente.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900 mb-1">Senha</label>
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-surface-50 border border-surface-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 flex justify-center items-center gap-2 px-4 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Criar minha conta'
                  )}
                </button>
              </form>
              <div className="mt-6 text-center text-sm text-surface-500">
                Já tem uma conta? <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Fazer login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
