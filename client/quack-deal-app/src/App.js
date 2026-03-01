import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Layout/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewAnalysis from './pages/NewAnalysis';
import DealDetail from './pages/DealDetail';
import Analytics from './pages/Analytics';

// Protected route wrapper
const Protected = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🧠</div>
          <p className="text-slate-400 text-sm">Loading quackDeal...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/dashboard" element={
          <Protected user={user}>
            <Dashboard user={user} />
          </Protected>
        } />
        <Route path="/new" element={
          <Protected user={user}>
            <NewAnalysis />
          </Protected>
        } />
        <Route path="/analytics" element={
          <Protected user={user}>
            <Analytics />
          </Protected>
        } />
        <Route path="/deal/:id" element={
          <Protected user={user}>
            <DealDetail />
          </Protected>
        } />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
