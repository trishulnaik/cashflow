'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AuthContainer from '../components/auth/AuthContainer';
import styles from './auth.module.css';

export default function AuthPage() {
  const router = useRouter();
  
  const handleAuthSuccess = () => {
    router.push('/');
  };
  
  return (
    <div className={styles.authPageContainer}>
      <div className={styles.authPageContent}>
        <AuthContainer 
          onAuthSuccess={handleAuthSuccess} 
          isModal={false} 
        />
      </div>
    </div>
  );
} 