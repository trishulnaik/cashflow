'use client';

import React, { useState, useEffect } from 'react';
import styles from './GameLayout.module.css';
import { useAuth } from '../firebase/AuthContext';
import { saveGameProgress, submitLeaderboardScore, getLatestGameProgress } from '../firebase/services';
import AuthContainer from './auth/AuthContainer';
import Leaderboard from './Leaderboard';

// Import phase components
import Dashboard from './phases/Dashboard';
import Negotiation from './phases/Negotiation';
import PaymentSchedule from './phases/PaymentSchedule';
import Vendors from './phases/Vendors';

// Game phase types
type GamePhase = 'dashboard' | 'negotiation' | 'payment' | 'gameover' | 'summary' | 'vendors';

// Add ScoreBadge and VendorStatus types
type ScoreBadge = 'bronze' | 'silver' | 'gold';
type VendorStatus = 'good' | 'tense' | 'bad';

// Props for the GameLayout component
interface GameLayoutProps {
  initialXP?: number;
  initialCash?: number;
  initialTimer?: number;
}

// Badge interface
interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export default function GameLayout({
  initialXP = 0,
  initialCash = 200000,
  initialTimer = 60 * 60, // 60 minutes in seconds
}: GameLayoutProps) {
  // Game state
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('dashboard');
  const [xp, setXP] = useState(initialXP);
  const [cash, setCash] = useState(initialCash);
  const [timer, setTimer] = useState(initialTimer);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Firebase auth state
  const { user, userProfile } = useAuth();
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Show leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Custom save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Mobile sidebar toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Game progress saving state
  const [gameId, setGameId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // Scoring system
  const [correctPriorities, setCorrectPriorities] = useState(0);
  const [discountDecisions, setDiscountDecisions] = useState(0);
  const [badDecisions, setBadDecisions] = useState(0);
  const [xpNotification, setXpNotification] = useState<{amount: number, reason: string} | null>(null);
  
  // New summary state
  const [vendorStatus, setVendorStatus] = useState<VendorStatus>('good');
  
  // Define initial payments data
  const initialPaymentsData = [
    {
      id: '1',
      name: 'Client ABC',
      amount: 20000,
      dueDate: '2023-08-10',
      priority: 'none',
      type: 'receivable'
    },
    {
      id: '2',
      name: 'Client XYZ',
      amount: 30000,
      dueDate: '2023-08-15',
      priority: 'none',
      type: 'receivable'
    },
    {
      id: '3',
      name: 'Supplier 123',
      amount: 150000,
      dueDate: '2023-08-05',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '4',
      name: 'Office Rent',
      amount: 100000,
      dueDate: '2023-08-01',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '5',
      name: 'Utilities',
      amount: 40000,
      dueDate: '2023-08-12',
      priority: 'none',
      type: 'payable'
    },
    {
      id: '6',
      name: 'Staff Salaries',
      amount: 30000,
      dueDate: '2023-08-28',
      priority: 'none',
      type: 'payable'
    }
  ];

  // Add state for payments
  const [payments, setPayments] = useState<any[]>(initialPaymentsData);
  
  // Badges
  const [badges, setBadges] = useState<Badge[]>([
    {
      id: 'negotiator',
      name: 'Master Negotiator',
      description: 'Successfully negotiated 3 discounts',
      unlocked: false,
      icon: '💼'
    },
    {
      id: 'prioritizer',
      name: 'Priority Manager',
      description: 'Set 5 correct priorities',
      unlocked: false,
      icon: '📋'
    },
    {
      id: 'saver',
      name: 'Cash Hoarder',
      description: 'Accumulated ₹50,000 in cash',
      unlocked: false,
      icon: '💰'
    },
    {
      id: 'planner',
      name: 'Payment Planner',
      description: 'Created and executed 3 payment plans',
      unlocked: false,
      icon: '📅'
    }
  ]);
  
  // Progress levels
  const levels = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 100 },
    { level: 3, xpRequired: 250 },
    { level: 4, xpRequired: 500 },
    { level: 5, xpRequired: 1000 }
  ];
  
  // Calculate current level and progress
  const getCurrentLevel = () => {
    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i].xpRequired) {
        return levels[i].level;
      }
    }
    return 1;
  };
  
  const getProgressToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    if (currentLevel === levels.length) return 100; // Max level
    
    const currentLevelXP = levels.find(l => l.level === currentLevel)?.xpRequired || 0;
    const nextLevelXP = levels.find(l => l.level === currentLevel + 1)?.xpRequired || 0;
    
    if (nextLevelXP === currentLevelXP) return 100;
    
    const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Function to handle transactions
  const handleTransaction = (amount: number) => {
    if (isGameOver) return; // Prevent transactions if game is over
    
    setCash(prevCash => {
      const newCash = prevCash + amount;
      
      // Check for cash below 0 - end game if happens
      if (newCash < 0) {
        setIsGameOver(true);
        addXP(-50, 'Game over: Insufficient funds');
        showSummary();
        return 0; // Set cash to 0
      }
      
      // Check for badge unlock: Cash Hoarder
      if (newCash >= 50000 && !badges.find(b => b.id === 'saver')?.unlocked) {
        unlockBadge('saver');
        addXP(50, 'Bonus: Cash balance ≥ ₹50,000');
      }
      
      return newCash;
    });
    
    if (amount > 0) {
      addXP(5, 'Positive cash flow'); // Earn XP for positive transactions
    }
  };

  // Function to add XP with reason tracking
  const addXP = (amount: number, reason: string = '') => {
    if (isGameOver) return; // Prevent XP gains if game is over
    
    setXP(prevXP => prevXP + amount);
    
    // Show XP notification
    if (amount !== 0) {
      setXpNotification({ amount, reason });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setXpNotification(null);
      }, 3000);
    }
  };
  
  // Function to add correct priority
  const addCorrectPriority = () => {
    setCorrectPriorities(prev => {
      const newCount = prev + 1;
      
      // Check for badge unlock: Priority Manager
      if (newCount >= 5 && !badges.find(b => b.id === 'prioritizer')?.unlocked) {
        unlockBadge('prioritizer');
      }
      
      return newCount;
    });
    
    addXP(30, 'Correct priority identified');
  };
  
  // Function to add discount/deferment decision
  const addDiscountDecision = () => {
    setDiscountDecisions(prev => {
      const newCount = prev + 1;
      
      // Check for badge unlock: Master Negotiator
      if (newCount >= 3 && !badges.find(b => b.id === 'negotiator')?.unlocked) {
        unlockBadge('negotiator');
      }
      
      return newCount;
    });
    
    addXP(50, 'Successful discount/deferment');
  };
  
  // Function to add bad decision
  const addBadDecision = () => {
    setBadDecisions(prev => prev + 1);
    addXP(-25, 'Bad financial decision');
  };
  
  // Function to unlock a badge
  const unlockBadge = (badgeId: string) => {
    setBadges(prev => 
      prev.map(badge => 
        badge.id === badgeId 
          ? { ...badge, unlocked: true } 
          : badge
      )
    );
    
    // Additional XP bonus for unlocking a badge
    addXP(25, `Badge unlocked: ${badges.find(b => b.id === badgeId)?.name}`);
  };

  // Timer functionality
  const startTimer = () => {
    if (isGameOver) return; // Prevent starting timer if game is over
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const resetGame = () => {
    setTimer(initialTimer);
    setCash(initialCash);
    setXP(initialXP);
    setCorrectPriorities(0);
    setDiscountDecisions(0);
    setBadDecisions(0);
    setBadges(prev => prev.map(badge => ({ ...badge, unlocked: false })));
    setIsGameOver(false);
    setCurrentPhase('dashboard');
    setPayments([...initialPaymentsData]); // Reset payments to initial data
    
    // Automatically start the timer for logged-in users
    if (user) {
      setIsTimerRunning(true);
    }
  };

  // Calculate score badge based on XP
  const getScoreBadge = (): ScoreBadge => {
    if (xp >= 400) return 'gold';
    if (xp >= 300) return 'silver';
    if (xp >= 200) return 'bronze';
    return 'bronze';
  };
  
  // Calculate vendor status
  const calculateVendorStatus = (): VendorStatus => {
    // Based on the ratio of bad decisions to good decisions
    const goodDecisions = correctPriorities + discountDecisions;
    const totalDecisions = goodDecisions + badDecisions;
    
    if (totalDecisions === 0) return 'good';
    
    const badRatio = badDecisions / totalDecisions;
    
    if (badRatio >= 0.5) return 'bad';
    if (badRatio >= 0.25) return 'tense';
    return 'good';
  };
  
  // Function to show summary
  const showSummary = () => {
    setVendorStatus(calculateVendorStatus());
    
    // Check if player maintained ₹50,000 reserve and award bonus XP
    if (cash >= 50000 && !isGameOver) {
      addXP(50, 'Bonus: Maintained ₹50,000 reserve');
    }
    
    setCurrentPhase('summary');
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && !isGameOver) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            setIsTimerRunning(false);
            setIsGameOver(true);
            showSummary();
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isGameOver]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format the currency with Rupee symbol
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  // Function to save game progress
  const saveProgress = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    try {
      const vendorStatus = calculateVendorStatus();
      const scoreBadge = getScoreBadge();
      
      const progress = {
        uid: user.uid,
        gameId: gameId || '',
        cash,
        xp,
        correctPriorities,
        discountDecisions,
        badDecisions,
        vendorStatus,
        scoreBadge,
        timer,
        isGameOver,
        payments
      };
      
      const savedGameId = await saveGameProgress(progress);
      setGameId(savedGameId);
      setLastSaved(new Date());
      
      // Show success message
      addXP(0, 'Game progress saved');
    } catch (error) {
      console.error('Error saving progress:', error);
      // Show error message
      addXP(0, 'Failed to save progress');
    }
  };

  // Load saved game progress when component mounts or user changes
  useEffect(() => {
    const loadSavedGame = async () => {
      if (!user) return;
      
      try {
        const savedGame = await getLatestGameProgress();
        
        if (savedGame) {
          // Update all game state with saved data
          setXP(savedGame.xp);
          setCash(savedGame.cash);
          setTimer(savedGame.timer);
          setCorrectPriorities(savedGame.correctPriorities);
          setDiscountDecisions(savedGame.discountDecisions);
          setBadDecisions(savedGame.badDecisions);
          setVendorStatus(savedGame.vendorStatus);
          setIsGameOver(savedGame.isGameOver);
          setGameId(savedGame.gameId);
          setLastSaved(new Date());
          
          // Load saved payments if available
          if (savedGame.payments && savedGame.payments.length > 0) {
            setPayments(savedGame.payments);
          }
          
          // Update badges based on saved progress
          if (savedGame.xp >= 500) unlockBadge('prioritizer');
          if (savedGame.discountDecisions >= 3) unlockBadge('negotiator');
          if (savedGame.cash >= 50000) unlockBadge('saver');
          
          addXP(0, 'Game progress loaded');
        }
        
        // Start timer automatically if the user is logged in and game is not over
        if (!isGameOver) {
          setIsTimerRunning(true);
        }
      } catch (error) {
        console.error('Error loading saved game:', error);
      }
    };
    
    loadSavedGame();
  }, [user]);

  // Handle page reload with custom dialog
  useEffect(() => {
    // Function to handle page reload/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isGameOver && isTimerRunning) {
        // Standard browser confirmation
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Do you want to leave without saving?';
        
        // We can't show our custom dialog here because most browsers now prevent it
        // But we can use this to stop unintentional reloads/navigations
        return 'You have unsaved progress. Do you want to leave without saving?';
      }
    };
    
    // Key press shortcut detection (Ctrl+R or F5)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+R (reload) or F5
      if ((!isGameOver && isTimerRunning) && 
          ((e.ctrlKey && e.key === 'r') || e.key === 'F5')) {
        // Show custom dialog
        e.preventDefault();
        setShowSaveDialog(true);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameOver, isTimerRunning, user]);

  // Function to handle save and reload
  const handleSaveAndReload = async () => {
    if (user) {
      await saveProgress();
    } else {
      // If not logged in, show auth modal first
      setShowAuthModal(true);
    }
    // After a slight delay, reload the page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Toggle sidebar for mobile view
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if device is mobile
  const isMobile = () => {
    return window.innerWidth <= 767;
  };

  // Set initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(isMobile());
    };
    
    // Set initial state
    handleResize();
    
    // Listen for window resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={styles.gameContainer}>
      {/* Mobile Header - Only visible on small screens when sidebar is collapsed */}
      {isMobile() && (
        <div className={styles.mobileHeader}>
          <span 
            className={styles.menuIcon} 
            onClick={toggleSidebar}
          >
            ☰
          </span>
          <div className={styles.logo}>CashFlow</div>
        </div>
      )}
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed && isMobile() ? styles.collapsed : ''}`}>
        <div className={styles.logo}>CashFlow</div>
        
        {/* Phase Navigation - Moved to top */}
        <nav className={styles.phaseNav}>
          <button 
            className={`${styles.phaseButton} ${currentPhase === 'dashboard' ? styles.activePhase : ''}`}
            onClick={() => {
              !isGameOver && setCurrentPhase('dashboard');
              if (isMobile()) setSidebarCollapsed(true);
            }}
            disabled={isGameOver}
          >
            Dashboard
          </button>
          <button 
            className={`${styles.phaseButton} ${currentPhase === 'negotiation' ? styles.activePhase : ''}`}
            onClick={() => {
              !isGameOver && setCurrentPhase('negotiation');
              if (isMobile()) setSidebarCollapsed(true);
            }}
            disabled={isGameOver}
          >
            Negotiation
          </button>
          <button 
            className={`${styles.phaseButton} ${currentPhase === 'vendors' ? styles.activePhase : ''}`}
            onClick={() => {
              !isGameOver && setCurrentPhase('vendors');
              if (isMobile()) setSidebarCollapsed(true);
            }}
            disabled={isGameOver}
          >
            Vendors
          </button>
          <button 
            className={`${styles.phaseButton} ${currentPhase === 'payment' ? styles.activePhase : ''}`}
            onClick={() => {
              !isGameOver && setCurrentPhase('payment');
              if (isMobile()) setSidebarCollapsed(true);
            }}
            disabled={isGameOver}
          >
            Payment Schedule
          </button>
        </nav>
        
        {/* User Auth Status Indicator */}
        <div className={styles.userSection}>
          {user ? (
            <div className={styles.userProfile}>
              {userProfile?.photoURL && (
                <img 
                  src={userProfile.photoURL} 
                  alt={userProfile.displayName || 'User'} 
                  className={styles.userAvatar}
                />
              )}
              <div className={styles.userName}>
                {userProfile?.displayName || userProfile?.email || 'Logged In'}
              </div>
              <button 
                onClick={saveProgress} 
                className={styles.saveButton}
                disabled={isGameOver}
              >
                Save Progress
              </button>
            </div>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Log in to save progress</p>
              <button 
                onClick={() => setShowAuthModal(true)} 
                className={styles.loginButton}
              >
                Log In / Register
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Level {getCurrentLevel()}</div>
            <div className={styles.statValue}>{xp} XP</div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${getProgressToNextLevel()}%` }}
              ></div>
            </div>
          </div>
          
          <div className={styles.stat}>
            <div className={styles.statLabel}>Timer</div>
            <div className={styles.statValue}>
              {formatTime(timer)}
              {!user && !isTimerRunning && !isGameOver ? (
                <button onClick={startTimer} className={styles.timerButton}>Start</button>
              ) : !user && !isGameOver ? (
                <button onClick={stopTimer} className={styles.timerButton}>Stop</button>
              ) : isGameOver ? (
                <span className={styles.gameOverIndicator}>Game Over</span>
              ) : (
                <span className={styles.timerRunning}>Running</span>
              )}
            </div>
          </div>
          
          <div className={styles.stat}>
            <div className={styles.statLabel}>Cash Balance</div>
            <div className={styles.statValue}>{formatCurrency(cash)}</div>
          </div>
          
          {/* Scoring stats */}
          <div className={styles.statScores}>
            <div className={styles.scoreStat}>
              <span>Correct Priorities:</span>
              <span>{correctPriorities} (+30 XP each)</span>
            </div>
            <div className={styles.scoreStat}>
              <span>Discount Decisions:</span>
              <span>{discountDecisions} (+50 XP each)</span>
            </div>
            <div className={styles.scoreStat}>
              <span>Bad Decisions:</span>
              <span>{badDecisions} (-25 XP each)</span>
            </div>
          </div>
          
          {/* Badges */}
          <div className={styles.badgesContainer}>
            <div className={styles.badgesTitle}>Achievement Badges</div>
            <div className={styles.badgesList}>
              {badges.map(badge => (
                <div 
                  key={badge.id} 
                  className={`${styles.badge} ${badge.unlocked ? styles.unlocked : styles.locked}`}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <div className={styles.badgeIcon}>{badge.icon}</div>
                  <div className={styles.badgeName}>{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Game Panel */}
      <main className={styles.mainPanel}>
        {/* XP Notification */}
        {xpNotification && (
          <div className={`${styles.xpNotification} ${xpNotification.amount > 0 ? styles.positive : styles.negative}`}>
            <span className={styles.xpAmount}>{xpNotification.amount > 0 ? '+' : ''}{xpNotification.amount} XP</span>
            {xpNotification.reason && <span className={styles.xpReason}>{xpNotification.reason}</span>}
          </div>
        )}
      
        {currentPhase === 'dashboard' && !isGameOver && (
          <Dashboard 
            handleTransaction={handleTransaction} 
            isGameOver={isGameOver} 
            addXP={addXP}
            addCorrectPriority={addCorrectPriority}
            addBadDecision={addBadDecision}
            payments={payments}
            setPayments={setPayments}
            cashBalance={cash}
          />
        )}
        
        {currentPhase === 'negotiation' && !isGameOver && (
          <Negotiation 
            handleTransaction={handleTransaction} 
            isGameOver={isGameOver} 
            addXP={addXP}
            cashBalance={cash}
            addDiscountDecision={addDiscountDecision}
            addBadDecision={addBadDecision}
          />
        )}
        
        {currentPhase === 'vendors' && !isGameOver && !showLeaderboard && (
          <Vendors 
            handleTransaction={handleTransaction} 
            isGameOver={isGameOver}
            addXP={addXP}
            addBadDecision={addBadDecision}
            vendorStatus={vendorStatus}
          />
        )}
        
        {currentPhase === 'payment' && !isGameOver && (
          <PaymentSchedule 
            handleTransaction={handleTransaction} 
            isGameOver={isGameOver}
            addXP={addXP}
            addBadDecision={addBadDecision}
            onSubmitPlan={showSummary}
            cashBalance={cash}
          />
        )}
        
        {currentPhase === 'summary' && (
          <div className={styles.phaseContent}>
            <div className={styles.summaryContainer}>
              <h1>Game Summary</h1>
              <p>Here's how you performed in managing your cash flow:</p>
              
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <h3>Cash Left</h3>
                  <div className={styles.summaryValue}>{formatCurrency(cash)}</div>
                </div>
                
                <div className={styles.summaryCard}>
                  <h3>XP Earned</h3>
                  <div className={styles.summaryValue}>{xp} XP</div>
                </div>
                
                <div className={styles.summaryCard}>
                  <h3>Vendor Status</h3>
                  <div className={`${styles.summaryValue} ${styles["status" + vendorStatus.charAt(0).toUpperCase() + vendorStatus.slice(1)]}`}>
                    {vendorStatus.charAt(0).toUpperCase() + vendorStatus.slice(1)}
                  </div>
                </div>
                
                <div className={styles.summaryCard}>
                  <h3>Score Badge</h3>
                  <div className={`${styles.summaryValue} ${styles.badge}`}>
                    <div className={`${styles.scoreBadge} ${styles[getScoreBadge()]}`}>
                      {getScoreBadge().charAt(0).toUpperCase() + getScoreBadge().slice(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.summaryDetails}>
                <h3>Performance Breakdown</h3>
                <div className={styles.statsList}>
                  <div className={styles.statsItem}>
                    <span>Correct Priorities:</span>
                    <span>{correctPriorities} × 30 XP = {correctPriorities * 30} XP</span>
                  </div>
                  <div className={styles.statsItem}>
                    <span>Discount Decisions:</span>
                    <span>{discountDecisions} × 50 XP = {discountDecisions * 50} XP</span>
                  </div>
                  <div className={styles.statsItem}>
                    <span>Bad Decisions:</span>
                    <span>{badDecisions} × -25 XP = {badDecisions * -25} XP</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.summaryActions}>
                <button onClick={() => setCurrentPhase('gameover')} className={styles.viewDetailsButton}>
                  View Final Report
                </button>
                <button onClick={resetGame} className={styles.resetButton}>
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {(currentPhase === 'gameover' || isGameOver && currentPhase !== 'summary') && (
          <div className={styles.phaseContent}>
            <div className={styles.gameOverContainer}>
              <h1>Game Over!</h1>
              <p>Your time has expired.</p>
              
              <div className={styles.finalScores}>
                <div className={styles.finalScore}>
                  <span>Final Cash Balance:</span>
                  <span>{formatCurrency(cash)}</span>
                </div>
                <div className={styles.finalScore}>
                  <span>Final XP:</span>
                  <span>{xp}</span>
                </div>
                <div className={styles.finalScore}>
                  <span>Level Achieved:</span>
                  <span>{getCurrentLevel()}</span>
                </div>
                <div className={styles.finalScore}>
                  <span>Performance Score:</span>
                  <span className={
                    xp >= 400 ? styles.goldScore : 
                    xp >= 300 ? styles.silverScore : 
                    xp >= 200 ? styles.bronzeScore : 
                    styles.failScore
                  }>
                    {xp >= 400 ? 'GOLD' : 
                     xp >= 300 ? 'SILVER' : 
                     xp >= 200 ? 'BRONZE' : 
                     'FAIL'}
                  </span>
                </div>
                <div className={styles.finalScore}>
                  <span>Badges Earned:</span>
                  <span>{badges.filter(b => b.unlocked).length} of {badges.length}</span>
                </div>
                <div className={styles.finalScore}>
                  <span>Final Cash Reserve:</span>
                  <span className={cash >= 50000 ? styles.positiveReserve : styles.negativeReserve}>
                    {formatCurrency(cash)}
                    {cash >= 50000 ? ' ✓' : ' ✗'}
                  </span>
                </div>
              </div>
              
              <div className={styles.scoringBreakdown}>
                <h3>Scoring Breakdown</h3>
                <div className={styles.scoreItem}>
                  <span>Correct Priorities:</span>
                  <span>{correctPriorities} × 30 XP = {correctPriorities * 30} XP</span>
                </div>
                <div className={styles.scoreItem}>
                  <span>Discount Decisions:</span>
                  <span>{discountDecisions} × 50 XP = {discountDecisions * 50} XP</span>
                </div>
                <div className={styles.scoreItem}>
                  <span>Bad Decisions:</span>
                  <span>{badDecisions} × -25 XP = {badDecisions * -25} XP</span>
                </div>
                {cash >= 50000 && (
                  <div className={styles.scoreItem}>
                    <span>Cash Balance Bonus:</span>
                    <span>+50 XP</span>
                  </div>
                )}
              </div>
              
              <button onClick={resetGame} className={styles.resetButton}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sidebar Toggle Button */}
      {isMobile() && sidebarCollapsed && (
        <button 
          className={styles.sidebarToggle} 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ≡
        </button>
      )}

      {/* Custom Save Dialog */}
      {showSaveDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.saveDialogContainer}>
            <h2>Save Progress?</h2>
            <p>You're about to leave the game. Would you like to save your progress first?</p>
            <div className={styles.saveDialogButtons}>
              <button 
                className={styles.saveButton}
                onClick={handleSaveAndReload}
              >
                Save & Leave
              </button>
              <button 
                className={styles.leaveButton}
                onClick={() => window.location.reload()}
              >
                Leave Without Saving
              </button>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && !user && (
        <AuthContainer 
          onAuthSuccess={() => {
            setShowAuthModal(false);
            // Save progress immediately after login
            setTimeout(saveProgress, 1000);
          }}
          isModal={true}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
} 