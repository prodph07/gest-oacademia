import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Wallet, Settings, LogOut, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

const navigation = [
  { name: 'Visão Global', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Academias (Tenants)', href: '/admin/gyms', icon: Building2 },
  { name: 'Faturamento', href: '/admin/billing', icon: Wallet },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-surface-900 border-r border-surface-800 h-full text-white">
      <div className="flex items-center justify-between h-16 border-b border-surface-800 px-4 bg-surface-900">
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-tight text-white">SaaS Admin</span>
          <span className="ml-2 text-xs bg-primary-600 px-2 py-0.5 rounded-full text-white font-medium">MASTER</span>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-2 text-surface-400 hover:text-white rounded-lg hover:bg-surface-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">
          Gestão da Plataforma
        </div>
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
                  ? 'bg-surface-800 text-white'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                  isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-primary-400'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-surface-800 bg-surface-900">
        <button 
          onClick={async () => await supabase.auth.signOut()}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-surface-400 rounded-lg hover:bg-surface-800 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
          Sair do Master
        </button>
      </div>
    </div>
  );
}
