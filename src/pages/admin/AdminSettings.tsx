import { Save, Percent, Building } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Configurações da Plataforma</h1>
          <p className="text-sm text-surface-500 mt-1">Ajuste as taxas globais e dados do seu SaaS.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-6 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Taxas e Comissões (Split)</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-surface-900">Comissão Padrão (SaaS)</label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <input
                  type="text"
                  disabled
                  value="2.0"
                  className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-surface-900 ring-1 ring-inset ring-surface-300 bg-surface-50 sm:text-sm sm:leading-6"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-surface-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-surface-500">Valor descontado de cada mensalidade paga pelas academias.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-900">Responsável por Taxas do Cartão/PIX</label>
              <select className="mt-2 block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-surface-900 ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6">
                <option>Academia Cliente (Padrão)</option>
                <option>Plataforma SaaS</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="p-6 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Dados do Recebedor (Master)</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-900">Recipient ID (Pagar.me)</label>
            <input
              type="text"
              disabled
              value="re_cml6yailo8uor0l9tojdu5tsk"
              className="mt-2 block w-full rounded-lg border-0 py-2.5 text-surface-900 ring-1 ring-inset ring-surface-300 bg-surface-50 sm:text-sm sm:leading-6 font-mono text-xs"
            />
            <p className="mt-2 text-xs text-surface-500">ID oficial onde o dinheiro do SaaS irá cair.</p>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
              <Save className="h-4 w-4" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
