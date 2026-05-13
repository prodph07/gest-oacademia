import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Users, X, CheckCircle, Plus, Trash2, Loader2, Edit } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

interface ClassData {
  id: string;
  class_name: string;
  instructor_name: string;
  max_capacity: number;
  schedule: string; // TIME string like '18:00' or ISO timestamp
  day_of_week?: string;
}

interface StudentData {
  id: string;
  name: string;
}

export default function ClassSchedule() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendances, setAttendances] = useState<{ [classId: string]: string[] }>({}); // classId -> studentIds
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    class_name: '',
    instructor_name: '',
    schedule: '',
    max_capacity: 20,
    day_of_week: 'Segunda'
  });

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

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

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('schedule', { ascending: true });
      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Fetch students for check-in list
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .order('name', { ascending: true });
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch attendances
      const { data: attendancesData, error: attError } = await supabase
        .from('class_attendances')
        .select('class_id, student_id');
      
      if (!attError && attendancesData) {
        const attMap: { [key: string]: string[] } = {};
        attendancesData.forEach(a => {
          if (!attMap[a.class_id]) attMap[a.class_id] = [];
          attMap[a.class_id].push(a.student_id);
        });
        setAttendances(attMap);
      }
    } catch (error) {
      console.error('Erro ao carregar grade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;

    try {
      // Formata a data para hoje com o horário selecionado
      const today = new Date();
      const [hours, minutes] = formData.schedule.split(':');
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (editingClassId) {
        const { data, error } = await supabase
          .from('classes')
          .update({
            class_name: formData.class_name,
            instructor_name: formData.instructor_name,
            schedule: today.toISOString(),
            max_capacity: formData.max_capacity,
            day_of_week: formData.day_of_week
          })
          .eq('id', editingClassId)
          .select()
          .single();

        if (error) throw error;
        setClasses(classes.map(c => c.id === editingClassId ? data : c));
      } else {
        const { data, error } = await supabase
          .from('classes')
          .insert([{
            tenant_id: gymId,
            class_name: formData.class_name,
            instructor_name: formData.instructor_name,
            schedule: today.toISOString(),
            max_capacity: formData.max_capacity,
            day_of_week: formData.day_of_week
          }])
          .select()
          .single();

        if (error) throw error;
        setClasses([...classes, data]);
      }

      setIsNewClassModalOpen(false);
      setEditingClassId(null);
      setFormData({ class_name: '', instructor_name: '', schedule: '', max_capacity: 20, day_of_week: 'Segunda' });
    } catch (error) {
      console.error('Erro ao salvar aula:', error);
      alert('Erro ao salvar aula.');
    }
  };

  const handleOpenEditClass = (e: React.MouseEvent, cls: ClassData) => {
    e.stopPropagation();
    setEditingClassId(cls.id);
    
    // Extrai a hora do schedule
    const scheduleDate = new Date(cls.schedule);
    const hours = scheduleDate.getHours().toString().padStart(2, '0');
    const minutes = scheduleDate.getMinutes().toString().padStart(2, '0');
    
    setFormData({
      class_name: cls.class_name,
      instructor_name: cls.instructor_name,
      schedule: `${hours}:${minutes}`,
      max_capacity: cls.max_capacity,
      day_of_week: cls.day_of_week || 'Segunda'
    });
    setIsNewClassModalOpen(true);
  };

  const handleDeleteClass = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evitar abrir o modal de check-in
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      setClasses(classes.filter(c => c.id !== id));
      if (selectedClass?.id === id) setSelectedClass(null);
    } catch (error) {
      console.error('Erro ao deletar aula:', error);
    }
  };

  const toggleCheckIn = async (studentId: string) => {
    if (!selectedClass || !gymId) return;
    
    const isCheckedIn = attendances[selectedClass.id]?.includes(studentId);
    
    try {
      if (isCheckedIn) {
        // Remover check-in
        const { error } = await supabase
          .from('class_attendances')
          .delete()
          .match({ class_id: selectedClass.id, student_id: studentId });
        
        if (error) throw error;
        
        setAttendances(prev => ({
          ...prev,
          [selectedClass.id]: prev[selectedClass.id].filter(id => id !== studentId)
        }));
      } else {
        // Fazer check-in
        const { error } = await supabase
          .from('class_attendances')
          .insert([{
            tenant_id: gymId,
            class_id: selectedClass.id,
            student_id: studentId
          }]);
        
        if (error) throw error;
        
        setAttendances(prev => ({
          ...prev,
          [selectedClass.id]: [...(prev[selectedClass.id] || []), studentId]
        }));
      }
    } catch (error) {
      console.error('Erro no check-in:', error);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200'
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Grade de Aulas</h1>
          <p className="mt-1 text-sm text-surface-500">Gerencie a agenda e faça o check-in dos alunos.</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center justify-center px-4 py-2 border border-surface-300 text-sm font-medium rounded-lg text-surface-700 bg-white hover:bg-surface-50 transition-colors">
            <CalendarIcon className="mr-2 -ml-1 h-5 w-5 text-surface-500" />
            Hoje
          </button>
          <button 
            onClick={() => {
              setEditingClassId(null);
              setFormData({ class_name: '', instructor_name: '', schedule: '', max_capacity: 20, day_of_week: 'Segunda' });
              setIsNewClassModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Nova Aula
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 bg-white border border-surface-200 rounded-xl">
          <CalendarIcon className="h-12 w-12 text-surface-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-surface-900">Nenhuma aula na grade</h3>
          <p className="text-surface-500 mt-1">Crie sua primeira aula para começar a fazer o check-in.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekDays.map(day => {
            const dayClasses = classes.filter(c => c.day_of_week === day || (!c.day_of_week && day === 'Segunda'));
            if (dayClasses.length === 0) return null;
            
            return (
              <div key={day} className="space-y-4">
                <h2 className="text-xl font-bold text-surface-800 border-b border-surface-200 pb-2">{day}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayClasses.map((cls, idx) => (
                    <div
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className={cn(
                        "border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md relative group",
                        colors[idx % colors.length]
                      )}
                    >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => handleOpenEditClass(e, cls)}
                  className="text-surface-400 hover:text-primary-500 bg-white p-1 rounded-md shadow-sm"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button 
                  onClick={(e) => handleDeleteClass(e, cls.id)}
                  className="text-surface-400 hover:text-red-500 bg-white p-1 rounded-md shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold pr-6">{cls.class_name}</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium opacity-80">
                  <Clock className="mr-2 h-4 w-4" />
                  {formatTime(cls.schedule)}
                </div>
                <div className="flex items-center text-sm font-medium opacity-80">
                  <Users className="mr-2 h-4 w-4" />
                  {(attendances[cls.id] || []).length} / {cls.max_capacity} alunos
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-current border-opacity-20 flex justify-between items-center">
                <span className="text-sm font-semibold opacity-90">{cls.instructor_name}</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-white bg-opacity-30 px-2 py-1 rounded">Check-in</span>
              </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Aula */}
      {isNewClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-surface-200">
              <h2 className="text-xl font-bold text-surface-900">{editingClassId ? 'Editar Aula' : 'Nova Aula'}</h2>
              <button onClick={() => setIsNewClassModalOpen(false)} className="text-surface-400 hover:text-surface-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-900">Nome da Aula/Modalidade</label>
                <input required type="text" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-900">Instrutor / Professor</label>
                <input required type="text" value={formData.instructor_name} onChange={e => setFormData({...formData, instructor_name: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-900">Horário (ex: 18:30)</label>
                  <input required type="time" value={formData.schedule} onChange={e => setFormData({...formData, schedule: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Dia da Semana</label>
                  <select
                    required
                    value={formData.day_of_week}
                    onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full px-4 py-2 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {weekDays.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900">Capacidade</label>
                  <input required type="number" min="1" value={formData.max_capacity} onChange={e => setFormData({...formData, max_capacity: parseInt(e.target.value)})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsNewClassModalOpen(false)} className="px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-500">Salvar Aula</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Check-in */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
              <div>
                <h3 className="text-lg font-bold text-surface-900">{selectedClass.class_name}</h3>
                <p className="text-sm text-surface-500">{formatTime(selectedClass.schedule)} - {selectedClass.instructor_name}</p>
              </div>
              <button 
                onClick={() => setSelectedClass(null)}
                className="text-surface-400 hover:text-surface-600 transition-colors p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <h4 className="font-medium text-surface-900">Lista de Presença</h4>
                <span className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                  {(attendances[selectedClass.id] || []).length} Confirmados
                </span>
              </div>
              
              {students.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">Nenhum aluno matriculado na academia ainda.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {students.map(student => {
                    const isCheckedIn = (attendances[selectedClass.id] || []).includes(student.id);
                    return (
                      <div 
                        key={student.id} 
                        onClick={() => toggleCheckIn(student.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          isCheckedIn ? "border-green-500 bg-green-50" : "border-surface-200 hover:border-primary-300"
                        )}
                      >
                        <span className={cn("font-medium", isCheckedIn ? "text-green-900" : "text-surface-700")}>
                          {student.name}
                        </span>
                        {isCheckedIn ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-surface-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-surface-200 bg-surface-50 flex justify-end">
              <button 
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
