import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar as CalendarIcon, Clock, Users, User as UserIcon, Loader2 } from 'lucide-react';

export default function StudentClasses() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (studentError) throw studentError;

      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('tenant_id', studentData.tenant_id)
        .order('schedule', { ascending: true });

      if (classesData) setClasses(classesData);

    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const groupedClasses = weekDays.reduce((acc, day) => {
    acc[day] = classes.filter(c => c.day_of_week === day);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Grade de Aulas</h1>
        <p className="mt-1 text-sm text-surface-500">Confira os horários de treino da sua academia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {weekDays.map(day => {
          const dayClasses = groupedClasses[day] || [];
          if (dayClasses.length === 0) return null;

          return (
            <div key={day} className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden flex flex-col">
              <div className="bg-surface-50 border-b border-surface-200 px-4 py-3 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary-600" />
                <h3 className="font-bold text-surface-900">{day}</h3>
                <span className="ml-auto bg-white text-surface-500 text-xs font-semibold px-2 py-1 rounded-md border border-surface-200">
                  {dayClasses.length} {dayClasses.length === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
              
              <div className="p-4 flex-1 space-y-4">
                {dayClasses.map(cls => (
                  <div key={cls.id} className="group relative border border-surface-100 rounded-lg p-3 hover:border-primary-200 hover:shadow-md transition-all bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-surface-900 leading-tight">{cls.class_name}</h4>
                      <span className="flex items-center text-xs font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded-md border border-primary-100">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(cls.schedule)}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center text-sm text-surface-600">
                        <UserIcon className="h-4 w-4 mr-2 text-surface-400" />
                        {cls.instructor_name}
                      </div>
                      <div className="flex items-center text-sm text-surface-600">
                        <Users className="h-4 w-4 mr-2 text-surface-400" />
                        Capacidade: {cls.max_capacity} alunos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {classes.length === 0 && (
        <div className="text-center py-20 bg-white border border-surface-200 rounded-xl">
          <CalendarIcon className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-surface-900">Nenhuma aula cadastrada</h3>
          <p className="text-surface-500">Sua academia ainda não disponibilizou a grade de horários.</p>
        </div>
      )}
    </div>
  );
}
