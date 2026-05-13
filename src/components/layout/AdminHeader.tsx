import { Bell, Menu } from 'lucide-react';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  return (
    <header className="bg-white border-b border-surface-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 text-surface-600 hover:text-surface-900 rounded-lg hover:bg-surface-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-base md:text-lg font-semibold text-surface-800 truncate">Painel Master</h2>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <button className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-50 transition-colors relative">
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          <span className="sr-only">Ver notificações</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 md:gap-3 md:border-l md:border-surface-200 md:pl-4 md:ml-2">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-surface-900">Admin CEO</span>
            <span className="text-xs text-primary-600 font-bold">Dono do SaaS</span>
          </div>
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-surface-800 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
