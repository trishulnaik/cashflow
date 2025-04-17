'use client';

import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle } from '../../firebase/services';
import styles from './Auth.module.css';

interface LoginFormProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onLoginSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginWithEmail(email, password);
      onLoginSuccess();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login with Google failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authForm}>
      <h2>Log In to CashFlow</h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input 
            type="email" 
            id="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton} 
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <div className={styles.divider}>
        <span>OR</span>
      </div>
      
      <button 
        onClick={handleGoogleLogin} 
        className={styles.googleButton} 
        disabled={loading}
      >
        Continue with Google
      </button>
      
      <div className={styles.switchOption}>
        Don&apos;t have an account?{' '}
        <button 
          onClick={onSwitchToRegister} 
          className={styles.switchButton}
          disabled={loading}
        >
          Register
        </button>
      </div>
    </div>
  );
} 