/// <reference types="vite/client" />
import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Loader2, KeyRound, Scale } from 'lucide-react';
import ModalShell from './ModalShell';
import { LegalDocument } from './LegalDocument';

export default function Login() {
  const { loginAsDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Email/Password States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Just for signup visual feedback
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      parseAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'signup') {
        if (!agreedToTerms) {
          throw new Error('Please agree to the Terms of Service and Privacy Policy to create an account.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setInfoMessage('Password reset link sent to your email.');
        setAuthMode('signin');
      }
    } catch (err: any) {
      parseAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const parseAuthError = (err: any) => {
    const code = err.code || '';
    console.error('Firebase Auth Error:', err);
    
    if (code === 'auth/unauthorized-domain') {
      setError('This domain is not whitelisted in Firebase yet. Please add it to your Authorized Domains in the Firebase Console.');
    } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      setError('Incorrect email or password. Please try again.');
    } else if (code === 'auth/email-already-in-use') {
      setError('This email address is already in use by another account.');
    } else if (code === 'auth/weak-password') {
      setError('Password is too weak. Must be at least 6 characters.');
    } else if (code === 'auth/invalid-email') {
      setError('Please enter a valid email address.');
    } else if (code === 'auth/operation-not-allowed') {
      setError('Email/Password sign-in is disabled. Please enable it under Sign-in Providers in the Firebase console.');
    } else {
      setError(err.message || 'An unexpected authentication error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-[#Fcfcfc] dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 250, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-40 dark:opacity-20 mix-blend-multiply"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-100/40 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px]" />
        </motion.div>
      </div>

      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[28px] shadow-[0_20px_60px_-15px_rgba(10,30,63,0.08)] p-8 md:p-10 text-center border border-slate-100 dark:border-slate-700 relative z-10">
        
        {/* Logo Section */}
        <div className="mb-8">
          <div className="flex flex-col items-center justify-center select-none">
            <div className="flex items-center text-[#0A1E3F] dark:text-white font-bold text-4xl tracking-tighter mb-1">
              <span>LUM</span>
              <div className="relative flex flex-col items-center mx-[1px]">
                <div className="absolute -top-3.5 text-[#0066FF]">
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(0,102,255,0.8)]" fill="currentColor">
                      <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z"/>
                    </svg>
                    <div className="absolute inset-0 bg-[#0066FF] blur-md rounded-full opacity-50 scale-150"></div>
                  </div>
                </div>
                <span>I</span>
              </div>
              <span>NA</span>
            </div>
            <p className="text-[9px] tracking-[0.25em] text-[#556981] dark:text-slate-400 font-bold uppercase mt-1">
              Notetaker & Advisor
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide mb-6">
          {authMode === 'signin' && 'Sign in to access your intelligence dashboard'}
          {authMode === 'signup' && 'Create your account to start profiling connections'}
          {authMode === 'forgot' && 'Reset your password to regain dashboard access'}
        </p>

        {/* Error / Alert Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-250 dark:border-red-900 rounded-xl font-medium mb-6 text-left"
            >
              {error}
            </motion.div>
          )}

          {infoMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-900 rounded-xl font-medium mb-6 text-left"
            >
              {infoMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Credentials Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          {authMode === 'signup' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-450 pointer-events-none">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-450 pointer-events-none">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {authMode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setError(null); }}
                    className="text-[10px] text-blue-500 hover:underline font-bold"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-450 pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {authMode === 'signup' && (
            <label className="flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span>
                I agree to the{' '}
                <button type="button" onClick={() => setLegalModal('terms')} className="text-blue-500 hover:underline font-semibold">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => setLegalModal('privacy')} className="text-blue-500 hover:underline font-semibold">
                  Privacy Policy
                </button>
                , including that Lumina's behavioral insights are advisory only and not an employment decision tool.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (authMode === 'signup' && !agreedToTerms)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {authMode === 'signin' && 'Sign In'}
                {authMode === 'signup' && 'Create Account'}
                {authMode === 'forgot' && 'Send Reset Link'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Auth Mode Toggle Link */}
        <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {authMode === 'signin' ? (
            <span>
              New here?{' '}
              <button onClick={() => { setAuthMode('signup'); setError(null); }} className="text-blue-500 hover:underline">
                Create account
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button onClick={() => { setAuthMode('signin'); setError(null); }} className="text-blue-500 hover:underline">
                Sign in
              </button>
            </span>
          )}
        </div>

        {/* Divider */}
        {authMode === 'signin' && (
          <div className="my-6 flex items-center justify-center gap-3">
            <span className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or continue with</span>
            <span className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></span>
          </div>
        )}

        {/* Google Authentication */}
        {authMode === 'signin' && (
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#0A1E3F] dark:text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="tracking-wide">Google Account</span>
          </button>
        )}

        {/* Developer / Demo Bypass Section */}
        {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60">
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider mb-3">
              Developer Options
            </p>
            <button
              type="button"
              onClick={() => loginAsDemo(email || 'demo@lumina.ai')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 border border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md"
            >
              <KeyRound size={14} className="text-amber-500" />
              Bypass & Access Dashboard
            </button>
          </div>
        )}

        {/* Legal footer links — always visible regardless of auth mode */}
        <p className="mt-6 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          By continuing you agree to our{' '}
          <button type="button" onClick={() => setLegalModal('terms')} className="underline hover:text-slate-600 dark:hover:text-slate-300">
            Terms of Service
          </button>{' '}
          and{' '}
          <button type="button" onClick={() => setLegalModal('privacy')} className="underline hover:text-slate-600 dark:hover:text-slate-300">
            Privacy Policy
          </button>
          . Lumina provides automated communication suggestions based on algorithmic profiling — final business decisions should rely on human discretion.
        </p>
      </div>

      {legalModal && (
        <ModalShell
          title={legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          icon={<Scale size={20} className="text-white" />}
          onClose={() => setLegalModal(null)}
        >
          <LegalDocument doc={legalModal} />
        </ModalShell>
      )}
    </div>
  );
}
