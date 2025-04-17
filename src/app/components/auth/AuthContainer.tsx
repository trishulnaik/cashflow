'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import styles from './Auth.module.css';

interface AuthContainerProps {
  onAuthSuccess: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function AuthContainer({ 
  onAuthSuccess, 
  isModal = false,
  onClose
}: AuthContainerProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleSwitchToRegister = () => setAuthMode('register');
  const handleSwitchToLogin = () => setAuthMode('login');

  const content = (
    <div className={styles.authContainer}>
      {!isModal && (
        <div className={styles.authHeader}>
          <h1>CashFlow</h1>
          <p>Log in or create an account to save your progress and compete on the leaderboard</p>
        </div>
      )}
      
      {authMode === 'login' ? (
        <LoginForm 
          onLoginSuccess={onAuthSuccess} 
          onSwitchToRegister={handleSwitchToRegister} 
        />
      ) : (
        <RegisterForm 
          onRegisterSuccess={onAuthSuccess} 
          onSwitchToLogin={handleSwitchToLogin} 
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
} 