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
    { name: 'Grade de Aulas', path: '/app/classes', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-surface-200 flex flex-col">
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

        <nav className="flex-1 px-4 space-y-1 overflow-x-auto flex md:flex-col md:overflow-visible">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[140px] md:min-w-0",
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

        <div className="p-4 border-t border-surface-200 mt-auto hidden md:block">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-surface-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5 text-surface-400 group-hover:text-red-500" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Logout (bottom right) */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white p-3 rounded-full shadow-lg"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
