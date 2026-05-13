import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import GymLayout from './components/layout/GymLayout';
import DashboardOverview from './pages/gym/DashboardOverview';
import StudentManagement from './pages/gym/StudentManagement';
import StudentProfile from './pages/gym/StudentProfile';
import ClassSchedule from './pages/gym/ClassSchedule';
import Financial from './pages/gym/Financial';
import GymSettings from './pages/gym/GymSettings';
import GymWithdrawals from './pages/gym/GymWithdrawals';

import AdminLayout from './components/layout/AdminLayout';
import MasterDashboard from './pages/admin/MasterDashboard';
import AdminGyms from './pages/admin/AdminGyms';
import AdminBilling from './pages/admin/AdminBilling';
import AdminSettings from './pages/admin/AdminSettings';

import AuthLayout from './components/auth/AuthLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StudentInvite from './pages/auth/StudentInvite';

import StudentLayout from './components/layout/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentFinancial from './pages/student/StudentFinancial';
import StudentClasses from './pages/student/StudentClasses';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'master' | 'gym' | 'student' | null>(null);

  useEffect(() => {
    const checkRole = async (userId: string, email: string | undefined) => {
      if (email === 'master@saas.com') {
        setUserRole('master');
        return;
      }
      // Check if user is a gym admin
      const { data: gym } = await supabase.from('gyms').select('id').eq('admin_user_id', userId).single();
      if (gym) {
        setUserRole('gym');
        return;
      }
      // Check if user is a student
      const { data: student } = await supabase.from('students').select('id').eq('auth_user_id', userId).single();
      if (student) {
        setUserRole('student');
        return;
      }
      setUserRole(null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkRole(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setLoading(true);
        checkRole(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-50">Carregando...</div>;
  }

  const getDashboardRoute = () => {
    if (userRole === 'master') return "/admin/dashboard";
    if (userRole === 'gym') return "/gym/dashboard";
    if (userRole === 'student') return "/app/dashboard";
    return "/login";
  };

  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!session ? <Login /> : <Navigate to={getDashboardRoute()} replace />} />
          <Route path="/register" element={!session ? <Register /> : <Navigate to={getDashboardRoute()} replace />} />
        </Route>
        
        {/* Rota de Convite de Aluno (Publica/Auth) */}
        <Route path="/invite/:gymId" element={!session ? <StudentInvite /> : <Navigate to={getDashboardRoute()} replace />} />
        
        {/* Rotas Privadas da Academia */}
        <Route path="/gym" element={session && userRole === 'gym' ? <GymLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="students/:id" element={<StudentProfile />} />
          <Route path="classes" element={<ClassSchedule />} />
          <Route path="financial" element={<Financial />} />
          <Route path="withdrawals" element={<GymWithdrawals />} />
          <Route path="settings" element={<GymSettings />} />
        </Route>

        {/* Rotas Master Admin (Dono do SaaS) */}
        <Route path="/admin" element={session && userRole === 'master' ? <AdminLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MasterDashboard />} />
          <Route path="gyms" element={<AdminGyms />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Rotas Portal do Aluno */}
        <Route path="/app" element={session && userRole === 'student' ? <StudentLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="financial" element={<StudentFinancial />} />
          <Route path="classes" element={<StudentClasses />} />
        </Route>

        {/* Redirect Fallback */}
        <Route path="/" element={<Navigate to={session ? getDashboardRoute() : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
