import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, ArrowUpRight, Megaphone, Trash2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function DashboardOverview() {
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [lateStudents, setLateStudents] = useState<number>(0);
  const [netRevenue, setNetRevenue] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [notices, setNotices] = useState<Notice[]>([]);
  const [gymId, setGymId] = useState<string | null>(null);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [isCreatingNotice, setIsCreatingNotice] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('admin_user_id', userData.user.id)
        .single();
      
      if (!gym) return;
      setGymId(gym.id);

      // Quadro de avisos
      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .eq('tenant_id', gym.id)
        .order('created_at', { ascending: false });
      
      if (noticesData) setNotices(noticesData);

      // Alunos Ativos
      const { count: total } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', gym.id);
      
      setTotalStudents(total || 0);

      // Inadimplentes
      const { count: late } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', gym.id)
        .eq('payment_status', 'late');
      
      setLateStudents(late || 0);

      // Receita Líquida
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('amount')
        .eq('tenant_id', gym.id)
        .eq('status', 'paid');

      if (paidOrders) {
        const gross = paidOrders.reduce((acc, curr) => acc + Number(curr.amount), 0) / 100;
        const net = gross * 0.98; // Deducting 2% SaaS fee
        setNetRevenue(net);
      }

      // Atividades recentes (Últimos 5 alunos criados)
      const { data: recentStudents } = await supabase
        .from('students')
        .select('id, name, created_at')
        .eq('tenant_id', gym.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentStudents) {
        setRecentActivity(recentStudents.map(s => ({
          id: s.id,
          type: 'new_student',
          description: `${s.name} se matriculou na academia`,
          time: new Date(s.created_at).toLocaleDateString('pt-BR')
        })));
      }

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId || !newNoticeTitle || !newNoticeContent) return;

    try {
      const { data, error } = await supabase
        .from('notices')
        .insert([{
          tenant_id: gymId,
          title: newNoticeTitle,
          content: newNoticeContent
        }])
        .select()
        .single();
      
      if (error) throw error;
      setNotices([data, ...notices]);
      setNewNoticeTitle('');
      setNewNoticeContent('');
      setIsCreatingNotice(false);
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
      alert('Erro ao criar aviso.');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm("Excluir este aviso?")) return;
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
      setNotices(notices.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erro ao deletar aviso:', error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const stats = [
    { name: 'Total de Alunos', value: totalStudents.toString(), icon: Users, change: '+0%', changeType: 'positive' },
    { name: 'Inadimplentes', value: lateStudents.toString(), icon: AlertCircle, change: '0%', changeType: 'positive' },
    { name: 'Receita Líquida', value: formatCurrency(netRevenue), icon: TrendingUp, change: '-2% Taxa SaaS', changeType: 'neutral' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-sm text-surface-500">Acompanhe as métricas principais da sua academia.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden rounded-xl border border-surface-200 shadow-sm transition-shadow hover:shadow-md">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-primary-500" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-surface-500 truncate">{stat.name}</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-surface-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-surface-50 px-6 py-3 border-t border-surface-100">
              <div className="text-sm">
                <span className={`font-medium ${stat.changeType === 'positive' ? 'text-green-600' : stat.changeType === 'neutral' ? 'text-surface-500' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                {stat.changeType !== 'neutral' && <span className="text-surface-500"> em relação ao mês passado</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Atividades Recentes e Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white border border-surface-200 rounded-xl shadow-sm">
            <div className="px-6 py-5 border-b border-surface-200 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-surface-900">Atividades Recentes</h3>
            </div>
            <ul role="list" className="divide-y divide-surface-100">
              {loading ? (
                <li className="px-6 py-10 text-center text-surface-500">Carregando atividades...</li>
              ) : recentActivity.length === 0 ? (
                <li className="px-6 py-10 text-center text-surface-500">Nenhuma atividade recente.</li>
              ) : recentActivity.map((activity) => (
                <li key={activity.id} className="px-6 py-5 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-surface-900">{activity.description}</p>
                      <p className="text-sm text-surface-500">{activity.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary-600 rounded-xl shadow-lg p-6 text-white text-center relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
            <div className="absolute inset-0 bg-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <ArrowUpRight className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold">Novo Aluno</h3>
              <p className="mt-2 text-sm text-primary-100">Vá para a Gestão de Alunos para matricular.</p>
            </div>
          </div>

          {/* Quadro de Avisos */}
          <div className="bg-white border border-surface-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-200 flex justify-between items-center bg-yellow-50">
              <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Quadro de Avisos
              </h3>
              <button 
                onClick={() => setIsCreatingNotice(!isCreatingNotice)}
                className="p-1 rounded bg-yellow-200 text-yellow-800 hover:bg-yellow-300 transition-colors"
              >
                {isCreatingNotice ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            {isCreatingNotice && (
              <form onSubmit={handleCreateNotice} className="p-4 bg-yellow-50/50 border-b border-yellow-100 space-y-3">
                <input
                  type="text"
                  placeholder="Título do aviso"
                  required
                  value={newNoticeTitle}
                  onChange={e => setNewNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-yellow-200 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                />
                <textarea
                  placeholder="Escreva o comunicado aqui..."
                  required
                  rows={3}
                  value={newNoticeContent}
                  onChange={e => setNewNoticeContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-yellow-200 rounded focus:ring-2 focus:ring-yellow-500 outline-none resize-none"
                />
                <button type="submit" className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded transition-colors">
                  Fixar Aviso
                </button>
              </form>
            )}

            <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
              {notices.length === 0 ? (
                <div className="p-6 text-center text-surface-500 text-sm">
                  Nenhum aviso no mural.
                </div>
              ) : (
                notices.map(notice => (
                  <div key={notice.id} className="p-4 hover:bg-surface-50 group relative">
                    <button 
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="absolute top-4 right-4 text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <h4 className="font-bold text-surface-900 pr-6">{notice.title}</h4>
                    <p className="text-sm text-surface-600 mt-1 whitespace-pre-wrap">{notice.content}</p>
                    <span className="text-xs text-surface-400 mt-3 block">
                      {new Date(notice.created_at).toLocaleDateString('pt-BR')} às {new Date(notice.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
