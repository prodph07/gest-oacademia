import { Bell } from 'lucide-react';

export default function AdminHeader() {
  return (
    <header className="bg-white border-b border-surface-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-surface-800">Painel de Controle Master</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-50 transition-colors relative">
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          <span className="sr-only">Ver notificações</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 border-l border-surface-200 pl-4 ml-2">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-surface-900">Admin CEO</span>
            <span className="text-xs text-primary-600 font-bold">Dono do SaaS</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-surface-800 flex items-center justify-center text-white font-bold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
