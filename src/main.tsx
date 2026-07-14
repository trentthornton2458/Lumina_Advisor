import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Login from './components/Login.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './components/Toast.tsx';
import './index.css';

const MainApp = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }
  
  return user ? <App /> : <Login />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
