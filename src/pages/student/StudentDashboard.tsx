import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Megaphone, CalendarDays, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      const { data: noticesData } = await supabase
        .from('notices')
        .select('*')
        .eq('tenant_id', studentData.tenant_id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (noticesData) setNotices(noticesData);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Olá, {student?.name.split(' ')[0]}!</h1>
        <p className="mt-1 text-sm text-surface-500">Bem-vindo ao seu portal do aluno.</p>
      </div>

      {/* Mural de Avisos */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 bg-surface-50 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-bold text-surface-900">Mural de Avisos</h2>
        </div>
        
        <div className="divide-y divide-surface-100 max-h-[500px] overflow-y-auto">
          {notices.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              Nenhum aviso no momento.
            </div>
          ) : (
            notices.map((notice) => (
              <div 
                key={notice.id} 
                className={cn(
                  "p-6 transition-colors",
                  notice.is_pinned ? "bg-amber-50/50" : "hover:bg-surface-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {notice.is_pinned && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Fixado
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-surface-900">{notice.title}</h3>
                    </div>
                    <p className="text-sm text-surface-600 whitespace-pre-wrap">{notice.content}</p>
                    <p className="text-xs text-surface-400 mt-3">
                      {new Date(notice.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
