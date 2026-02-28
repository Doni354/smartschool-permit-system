import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, DEMO_SCHOOLS } from './types';
import { StudentEntry } from './pages/StudentEntry';
import { AdminDashboard } from './pages/AdminDashboard';
import { PrintPreviewPage } from './pages/PrintPreviewPage';
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

// -- Login Page --
const LoginPage: React.FC<{ onLoginSuccess: (user: User) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess({
        id: cred.user.uid,
        name: cred.user.displayName || 'Admin',
        email: cred.user.email || '',
        role: 'ADMIN',
        schoolId: DEMO_SCHOOLS[0].id,
      });
      navigate('/admin');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email atau password salah.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi nanti.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError('Gagal masuk. Periksa koneksi internet.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
        <div className="flex justify-center mb-5">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-1 text-slate-800">Admin Login</h2>
        <p className="text-center text-slate-500 text-sm mb-6">Masuk untuk mengelola data izin siswa</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-slate-700">Email</label>
            <input
              type="email" required autoComplete="email" placeholder="contoh@sekolah.id"
              className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-slate-700">Password</label>
            <input
              type="password" required autoComplete="current-password" placeholder="••••••••"
              className="w-full border border-slate-300 px-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 mt-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Memverifikasi...</> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};

// -- Auth Guard --
const AdminRoute: React.FC<{ user: User | null; school: any; onLogout: () => void }> = ({ user, school, onLogout }) => {
  if (!user) return <Navigate to="/login" replace />;
  return <AdminDashboard user={user} school={school} onLogout={onLogout} />;
};

// -- Root App --
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Admin',
          email: firebaseUser.email || '',
          role: 'ADMIN',
          schoolId: DEMO_SCHOOLS[0].id,
        });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const userSchool = DEMO_SCHOOLS[0];

  return (
    <BrowserRouter>
      <Routes>
        {/* Public: Student late-entry form */}
        <Route path="/" element={<StudentEntry schools={DEMO_SCHOOLS} />} />

        {/* Login page */}
        <Route
          path="/login"
          element={
            currentUser
              ? <Navigate to="/admin" replace />
              : <LoginPage onLoginSuccess={setCurrentUser} />
          }
        />

        {/* Admin routes (protected) */}
        <Route
          path="/admin/*"
          element={<AdminRoute user={currentUser} school={userSchool} onLogout={handleLogout} />}
        />

        {/* Print preview */}
        <Route path="/print/:id" element={<PrintPreviewPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;