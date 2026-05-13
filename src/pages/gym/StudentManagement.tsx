import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Loader2, X, DollarSign, Edit, Trash2, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabase';
import CheckoutModal from '../../components/payment/CheckoutModal';

const cn = (...inputs: (string | undefined | null | false)[]) => {
  return twMerge(clsx(inputs));
};

interface Student {
  id: string;
  name: string;
  phone: string;
  document: string;
  modality: string;
  belt_rank: string;
  payment_status: string;
  birth_date?: string;
  enrollment_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  email?: string;
  auth_user_id?: string;
  orders?: { status: string }[];
}

export default function StudentManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Gym data state for Pagar.me
  const [gymData, setGymData] = useState<{ id: string, pagarme_recipient_id: string } | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    document: '',
    modality: '',
    belt_rank: '',
    birth_date: '',
    enrollment_date: '',
    guardian_name: '',
    guardian_phone: '',
    email: '',
    password: '',
    auth_user_id: '',
  });
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    fetchData();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: gym } = await supabase
          .from('gyms')
          .select('id, pagarme_recipient_id, monthly_fee_cents')
          .eq('admin_user_id', userData.user.id)
          .single();
        
        if (gym) setGymData(gym);
      }

      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`id, name, phone, document, modality, belt_rank, payment_status, email, auth_user_id, orders(status)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStudents((studentsData as unknown) as Student[] || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewStudentModal = () => {
    setIsEditing(false);
    setIsMinor(false);
    setFormData({ id: '', name: '', phone: '', document: '', modality: '', belt_rank: '', birth_date: '', enrollment_date: '', guardian_name: '', guardian_phone: '', email: '', password: '', auth_user_id: '' });
    setIsStudentModalOpen(true);
  };

  const openEditStudentModal = (student: Student) => {
    setIsEditing(true);
    setIsMinor(!!student.guardian_name || !!student.guardian_phone);
    setFormData({
      id: student.id,
      name: student.name || '',
      phone: student.phone || '',
      document: student.document || '',
      modality: student.modality || '',
      belt_rank: student.belt_rank || '',
      birth_date: student.birth_date ? student.birth_date.split('T')[0] : '',
      enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      email: student.email || '',
      password: '',
      auth_user_id: student.auth_user_id || ''
    });
    setOpenDropdownId(null);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymData) return;

    try {
      let finalAuthUserId = formData.auth_user_id;

      // Se informou email e senha, vamos criar ou atualizar o usuário na Edge Function
      if (formData.email) {
        const { data: authData, error: authError } = await supabase.functions.invoke('manage-student-auth', {
          body: {
            action: finalAuthUserId ? 'update' : 'create',
            email: formData.email,
            password: formData.password || undefined,
            auth_user_id: finalAuthUserId || undefined
          }
        });

        if (authError) {
          console.error("Erro na Edge Function de Auth:", authError);
          alert("Erro ao criar credenciais de acesso. O email já pode estar em uso.");
          return;
        }

        if (authData?.user?.id) {
          finalAuthUserId = authData.user.id;
        }
      }

      if (isEditing) {
        const { data, error } = await supabase
          .from('students')
          .update({
            name: formData.name,
            phone: formData.phone,
            document: formData.document,
            modality: formData.modality,
            belt_rank: formData.belt_rank,
            birth_date: formData.birth_date || null,
            enrollment_date: formData.enrollment_date || null,
            guardian_name: isMinor ? formData.guardian_name : null,
            guardian_phone: isMinor ? formData.guardian_phone : null,
            email: formData.email || null,
            auth_user_id: finalAuthUserId || null,
          })
          .eq('id', formData.id)
          .select()
          .single();

        if (error) throw error;
        setStudents(students.map(s => s.id === data.id ? (data as unknown as Student) : s));
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert([{
            tenant_id: gymData.id,
            name: formData.name,
            phone: formData.phone,
            document: formData.document,
            modality: formData.modality,
            belt_rank: formData.belt_rank,
            birth_date: formData.birth_date || null,
            enrollment_date: formData.enrollment_date || null,
            guardian_name: isMinor ? formData.guardian_name : null,
            guardian_phone: isMinor ? formData.guardian_phone : null,
            email: formData.email || null,
            auth_user_id: finalAuthUserId || null,
            payment_status: 'pending'
          }])
          .select()
          .single();

        if (error) throw error;
        setStudents([data as unknown as Student, ...students]);
      }

      setIsStudentModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      alert('Erro ao salvar aluno.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.")) return;
    
    setOpenDropdownId(null);
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== id));
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      alert('Erro ao excluir aluno.');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    setOpenDropdownId(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ payment_status: 'paid' })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      setStudents(students.map(s => s.id === id ? (data as unknown as Student) : s));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const handleChargeStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsPixModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Gestão de Alunos</h1>
          <p className="text-sm text-surface-500 mt-1">Gerencie matrículas, planos e status de pagamento.</p>
        </div>
        <button 
          onClick={openNewStudentModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <Plus className="h-4 w-4" />
          Novo Aluno
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden" ref={dropdownRef}>
        <div className="p-4 border-b border-surface-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-surface-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, plano ou modalidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-surface-900 ring-1 ring-inset ring-surface-300 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-surface-300 hover:bg-surface-50 text-surface-700 text-sm font-medium rounded-lg transition-colors">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Aluno</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Modalidade / Faixa</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-primary-500" />
                    Carregando alunos...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-surface-500">
                    Nenhum aluno encontrado. Cadastre o seu primeiro aluno!
                  </td>
                </tr>
              ) : (
                students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((student) => (
                  <tr key={student.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                            {student.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-surface-900">{student.name}</div>
                          <div className="text-sm text-surface-500">{student.phone || 'Sem telefone'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900">{student.modality || 'Não definida'}</div>
                      <div className="text-sm text-surface-500">{student.belt_rank || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                        student.payment_status === 'paid' && "bg-green-100 text-green-800",
                        student.payment_status === 'pending' && "bg-yellow-100 text-yellow-800",
                        student.payment_status === 'late' && "bg-red-100 text-red-800"
                      )}>
                        {student.payment_status === 'paid' ? 'Em dia' : student.payment_status === 'pending' ? 'Pendente' : 'Atrasado'}
                      </span>
                      {student.orders && student.orders.filter(o => o.status === 'paid').length > 0 && (
                        <div className="mt-1.5 text-xs text-surface-500 font-medium">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5 animate-pulse"></span>
                          {student.orders.filter(o => o.status === 'paid').length} meses pagos
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                      {student.payment_status !== 'paid' && (
                         <button 
                           onClick={() => handleChargeStudent(student)}
                           className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 font-semibold rounded-lg transition-colors mr-3"
                         >
                           <DollarSign className="h-4 w-4" />
                           Cobrar PIX
                         </button>
                      )}
                      
                      {/* Menu de Opções */}
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === student.id ? null : student.id)}
                        className="text-surface-400 hover:text-surface-600 transition-colors p-1 rounded-full hover:bg-surface-100"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {openDropdownId === student.id && (
                        <div className="absolute right-6 top-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => openEditStudentModal(student)}
                            className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2 transition-colors"
                          >
                            <Edit className="h-4 w-4 text-surface-400" />
                            Editar Aluno
                          </button>
                          
                          {student.payment_status !== 'paid' && (
                            <button 
                              onClick={() => handleMarkAsPaid(student.id)}
                              className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              Marcar como Pago
                            </button>
                          )}

                          <div className="h-px bg-surface-200 my-1 mx-2"></div>
                          
                          <button 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            Excluir Aluno
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Salvar/Editar Aluno */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-surface-200">
              <h3 className="font-semibold text-surface-900">
                {isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-surface-400 hover:text-surface-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-900">Nome Completo</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-900">CPF (Para Cobrança PIX)</label>
                <input required type="text" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-900">Modalidade</label>
                  <input type="text" value={formData.modality} onChange={e => setFormData({...formData, modality: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900">Faixa/Nível</label>
                  <input type="text" value={formData.belt_rank} onChange={e => setFormData({...formData, belt_rank: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-900">E-mail de Acesso (Portal do Aluno)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="aluno@email.com" className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900">{isEditing && formData.auth_user_id ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso'}</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditing && formData.auth_user_id ? '********' : 'Senha para o aluno'} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
              </div>
              
              <hr className="border-surface-200 my-4" />

              <div>
                <label className="block text-sm font-medium text-surface-900">Telefone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-900">Data de Nascimento</label>
                  <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-900">Mês/Data de Matrícula</label>
                  <input type="date" value={formData.enrollment_date} onChange={e => setFormData({...formData, enrollment_date: e.target.value})} className="mt-1 block w-full rounded-md border-surface-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isMinor" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                <label htmlFor="isMinor" className="text-sm font-medium text-surface-700">Aluno menor de idade?</label>
              </div>

              {isMinor && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-orange-900">Nome do Responsável</label>
                    <input required={isMinor} type="text" value={formData.guardian_name} onChange={e => setFormData({...formData, guardian_name: e.target.value})} className="mt-1 block w-full rounded-md border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900">Contato Responsável</label>
                    <input required={isMinor} type="text" value={formData.guardian_phone} onChange={e => setFormData({...formData, guardian_phone: e.target.value})} className="mt-1 block w-full rounded-md border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm" />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-between items-center border-t border-surface-200 mt-6">
                {isEditing ? (
                  <button type="button" onClick={() => navigate(`/gym/students/${formData.id}`)} className="text-sm text-primary-600 hover:text-primary-700 font-semibold px-3 py-2 bg-primary-50 rounded-lg transition-colors">
                    Ver Perfil Completo
                  </button>
                ) : <div />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsStudentModalOpen(false)} className="px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-500">
                    {isEditing ? 'Salvar Alterações' : 'Criar Aluno'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {selectedStudent && gymData && (
        <CheckoutModal 
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          student={selectedStudent}
          gymRecipientId={gymData.pagarme_recipient_id}
          gymId={gymData.id}
          amountInCents={gymData.monthly_fee_cents || 15000}
        />
      )}
    </div>
  );
}
