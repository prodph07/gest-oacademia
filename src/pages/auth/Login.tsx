import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Dumbbell, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Determinar para onde redirecionar baseado no papel do usuário
      if (data.user?.email === 'master@saas.com') {
        navigate('/admin/dashboard');
      } else {
        // Verifica se é admin de academia
        const { data: gym } = await supabase.from('gyms').select('id').eq('admin_user_id', data.user!.id).single();
        if (gym) {
          navigate('/gym/dashboard');
        } else {
          // Verifica se é aluno
          const { data: student } = await supabase.from('students').select('id').eq('auth_user_id', data.user!.id).single();
          if (student) {
            navigate('/app/dashboard');
          } else {
            navigate('/gym/dashboard'); // Fallback
          }
        }
      }
      
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
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
        <h2 className="text-3xl font-bold tracking-tight text-surface-900">Bem-vindo de volta</h2>
        <p className="mt-2 text-sm text-surface-500">
          Não tem uma conta?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            Cadastre sua academia
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-900">
              Endereço de E-mail
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-900">
              Senha
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 text-surface-900 shadow-sm ring-1 ring-inset ring-surface-300 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-600"
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm leading-6 text-surface-500">
                Lembrar de mim
              </label>
            </div>

            <div className="text-sm leading-6">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Esqueceu a senha?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-70 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Entrando...
                </>
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
