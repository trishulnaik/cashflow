import GameLayout from './components/GameLayout';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  // 60 minutes in seconds
  const sixtyMinutesInSeconds = 60 * 60;
  
  return (
    <main className={styles.main}>
      <div className={styles.loginTestContainer}>
        <Link href="/auth" className={styles.authTestButton}>
          Go to Login/Registration Page
        </Link>
      </div>
      <GameLayout initialXP={50} initialCash={200000} initialTimer={sixtyMinutesInSeconds} />
    </main>
  );
}
