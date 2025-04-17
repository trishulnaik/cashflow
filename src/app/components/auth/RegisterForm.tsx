'use client';

import React, { useState } from 'react';
import { registerWithEmail } from '../../firebase/services';
import styles from './Auth.module.css';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onRegisterSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await registerWithEmail(email, password);
      onRegisterSuccess();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authForm}>
      <h2>Register for CashFlow</h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <form onSubmit={handleRegister}>
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
        
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton} 
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      <div className={styles.switchOption}>
        Already have an account?{' '}
        <button 
          onClick={onSwitchToLogin} 
          className={styles.switchButton}
          disabled={loading}
        >
          Log In
        </button>
      </div>
    </div>
  );
} 