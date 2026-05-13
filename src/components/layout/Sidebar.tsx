import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, CreditCard, Banknote, Settings, LogOut, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

const navigation = [
  { name: 'Visão Geral', href: '/gym/dashboard', icon: LayoutDashboard },
  { name: 'Alunos', href: '/gym/students', icon: Users },
  { name: 'Grade de Aulas', href: '/gym/classes', icon: Calendar },
  { name: 'Financeiro', href: '/gym/financial', icon: CreditCard },
  { name: 'Saques', href: '/gym/withdrawals', icon: Banknote },
  { name: 'Configurações', href: '/gym/settings', icon: Settings },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-surface-200 h-full">
      <div className="flex items-center justify-between h-16 border-b border-surface-200 px-4">
        <span className="text-xl font-bold text-surface-900 tracking-tight">GymFlow</span>
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-2 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                  isActive ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-surface-200">
        <button 
          onClick={async () => await supabase.auth.signOut()}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
          Sair
        </button>
      </div>
    </div>
  );
}
