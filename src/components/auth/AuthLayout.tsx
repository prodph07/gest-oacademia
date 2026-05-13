import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-surface-50">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Outlet />
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
          alt="Gym background"
        />
        <div className="absolute inset-0 bg-primary-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Gestão de Excelência para sua Academia
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              Controle alunos, mensalidades e grade de aulas de forma simples, moderna e eficiente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
