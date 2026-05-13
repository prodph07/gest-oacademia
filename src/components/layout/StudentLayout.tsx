import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, CreditCard, CalendarDays, LogOut, Dumbbell } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};
import { useState, useEffect } from 'react';

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [gymName, setGymName] = useState('');

  useEffect(() => {
    const fetchGymName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: student } = await supabase
          .from('students')
          .select('tenant_id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (student) {
          const { data: gym } = await supabase
            .from('gyms')
            .select('name')
            .eq('id', student.tenant_id)
            .single();
            
          if (gym) setGymName(gym.name);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchGymName();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Início', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Financeiro', path: '/app/financial', icon: CreditCard },
    { name: 'Aulas', path: '/app/classes', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-surface-200 flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-surface-900 tracking-tight">Portal do Aluno</span>
              {gymName && <p className="text-xs text-primary-600 font-semibold">{gymName}</p>}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary-50 text-primary-700" 
                    : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-primary-600" : "text-surface-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surface-200 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-surface-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5 text-surface-400" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 p-1.5 rounded-lg">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-surface-900">Portal do Aluno</span>
            {gymName && <p className="text-[10px] text-primary-600 font-semibold leading-none">{gymName}</p>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-surface-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-20 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors flex-1",
                  isActive 
                    ? "text-primary-600" 
                    : "text-surface-400"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
