import { Bell, Search } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-surface-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center w-full max-w-md">
        <div className="relative w-full text-surface-400 focus-within:text-surface-600">
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            id="search-field"
            className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-surface-900 placeholder-surface-500 focus:outline-none focus:ring-0 focus:border-transparent sm:text-sm bg-transparent"
            placeholder="Buscar alunos, aulas..."
            type="search"
            name="search"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-50 transition-colors">
          <span className="sr-only">Ver notificações</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Perfil */}
        <div className="flex items-center gap-3 border-l border-surface-200 pl-4 ml-2">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-surface-900">Elite Martial Arts</span>
            <span className="text-xs text-surface-500">Administrador</span>
          </div>
          <img
            className="h-9 w-9 rounded-full bg-surface-200 object-cover"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          />
        </div>
      </div>
    </header>
  );
}
