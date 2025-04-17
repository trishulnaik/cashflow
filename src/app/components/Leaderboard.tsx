'use client';

import React, { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../firebase/services';
import styles from './Leaderboard.module.css';
import { Timestamp, FieldValue } from 'firebase/firestore';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<(LeaderboardEntry & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard(20); // Get top 20 players
        setLeaderboardData(data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Format date
  const formatDate = (timestamp: Timestamp | FieldValue | null) => {
    if (!timestamp || !(timestamp instanceof Timestamp)) return 'N/A';
    
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className={styles.leaderboardContainer}>
      <h2 className={styles.leaderboardTitle}>Global Leaderboard</h2>
      <p className={styles.leaderboardSubtitle}>Top players ranked by XP</p>

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading leaderboard...</p>
        </div>
      )}

      {error && !loading && (
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && leaderboardData.length === 0 && (
        <div className={styles.emptyContainer}>
          <p>No leaderboard entries yet. Be the first to submit your score!</p>
        </div>
      )}

      {!loading && !error && leaderboardData.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.leaderboardTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>XP</th>
                <th>Cash</th>
                <th>Badge</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => (
                <tr key={entry.id} className={index < 3 ? styles.topRank : ''}>
                  <td className={styles.rankCell}>
                    <span className={`${styles.rank} ${styles[`rank${index + 1}`]}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className={styles.playerCell}>
                    <div className={styles.playerInfo}>
                      {entry.photoURL && (
                        <img 
                          src={entry.photoURL} 
                          alt={entry.displayName} 
                          className={styles.playerAvatar} 
                        />
                      )}
                      <span>{entry.displayName || 'Anonymous Player'}</span>
                    </div>
                  </td>
                  <td className={styles.xpCell}>{entry.xp} XP</td>
                  <td className={styles.cashCell}>₹{entry.cash.toLocaleString()}</td>
                  <td className={styles.badgeCell}>
                    <span className={`${styles.badge} ${styles[entry.scoreBadge]}`}>
                      {entry.scoreBadge.charAt(0).toUpperCase() + entry.scoreBadge.slice(1)}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{formatDate(entry.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 