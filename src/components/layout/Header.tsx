import { Bell, Search, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-surface-200 h-14 md:h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger menu - mobile only */}
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 text-surface-600 hover:text-surface-900 rounded-lg hover:bg-surface-100 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Search - hidden on small mobile */}
        <div className="hidden sm:flex relative w-full max-w-md text-surface-400 focus-within:text-surface-600">
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <input
            id="search-field"
            className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-surface-900 placeholder-surface-500 focus:outline-none focus:ring-0 focus:border-transparent text-sm bg-transparent"
            placeholder="Buscar alunos, aulas..."
            type="search"
            name="search"
          />
        </div>

        {/* Mobile title */}
        <span className="sm:hidden text-lg font-bold text-surface-900 truncate">GymFlow</span>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <button className="p-2 text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-50 transition-colors">
          <span className="sr-only">Ver notificações</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Perfil - compact on mobile */}
        <div className="flex items-center gap-2 md:gap-3 md:border-l md:border-surface-200 md:pl-4 md:ml-2">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-surface-900">Elite Martial Arts</span>
            <span className="text-xs text-surface-500">Administrador</span>
          </div>
          <img
            className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-surface-200 object-cover"
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          />
        </div>
      </div>
    </header>
  );
}
