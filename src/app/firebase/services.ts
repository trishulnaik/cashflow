import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp,
  where,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  User
} from 'firebase/auth';
import { db, auth } from './config';

// Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp | FieldValue | null;
}

export interface GameProgress {
  uid: string;
  gameId: string;
  cash: number;
  xp: number;
  correctPriorities: number;
  discountDecisions: number;
  badDecisions: number;
  vendorStatus: 'good' | 'tense' | 'bad';
  scoreBadge: 'bronze' | 'silver' | 'gold';
  timer: number;
  isGameOver: boolean;
  lastUpdated: Timestamp | FieldValue | null;
  payments?: {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    priority: 'none' | 'high' | 'medium' | 'low';
    type: 'receivable' | 'payable';
  }[];
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  cash: number;
  scoreBadge: 'bronze' | 'silver' | 'gold';
  completedAt: Timestamp | FieldValue | null;
}

// Authentication functions
export const loginWithEmail = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export const logoutUser = async () => {
  return await signOut(auth);
};

export const createUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp()
    };
    
    await setDoc(userRef, userProfile);
    return userProfile;
  }
  
  return userSnap.data() as UserProfile;
};

// Game progress functions
export const saveGameProgress = async (progress: Omit<GameProgress, 'lastUpdated'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const gameRef = progress.gameId 
    ? doc(db, 'gameProgress', progress.gameId) 
    : doc(collection(db, 'gameProgress'));
  
  const gameData: GameProgress = {
    ...progress,
    lastUpdated: serverTimestamp()
  };
  
  await setDoc(gameRef, gameData);
  return gameRef.id;
};

export const loadGameProgress = async (gameId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const gameRef = doc(db, 'gameProgress', gameId);
  const gameSnap = await getDoc(gameRef);
  
  if (!gameSnap.exists()) {
    throw new Error('Game progress not found');
  }
  
  return gameSnap.data() as GameProgress;
};

export const getLatestGameProgress = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const q = query(
    collection(db, 'gameProgress'),
    where('uid', '==', user.uid),
    orderBy('lastUpdated', 'desc'),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { ...doc.data(), gameId: doc.id } as GameProgress;
};

// Leaderboard functions
export const submitLeaderboardScore = async (score: Omit<LeaderboardEntry, 'completedAt'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const leaderboardRef = collection(db, 'leaderboard');
  
  const leaderboardEntry: LeaderboardEntry = {
    ...score,
    completedAt: serverTimestamp()
  };
  
  return await addDoc(leaderboardRef, leaderboardEntry);
};

export const getLeaderboard = async (limitCount: number = 10) => {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('xp', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as (LeaderboardEntry & { id: string })[];
};

// User game stats
export const getUserStats = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const q = query(
    collection(db, 'gameProgress'),
    where('uid', '==', user.uid),
    where('isGameOver', '==', true)
  );
  
  const querySnapshot = await getDocs(q);
  const games = querySnapshot.docs.map(doc => ({ ...doc.data() })) as GameProgress[];
  
  if (games.length === 0) {
    return {
      gamesPlayed: 0,
      totalXP: 0,
      highestXP: 0,
      highestCash: 0,
      bestBadge: 'bronze'
    };
  }
  
  const totalXP = games.reduce((sum, game) => sum + game.xp, 0);
  const highestXP = Math.max(...games.map(game => game.xp));
  const highestCash = Math.max(...games.map(game => game.cash));
  
  // Find best badge
  let bestBadge: 'bronze' | 'silver' | 'gold' = 'bronze';
  if (games.some(game => game.scoreBadge === 'gold')) {
    bestBadge = 'gold';
  } else if (games.some(game => game.scoreBadge === 'silver')) {
    bestBadge = 'silver';
  }
  
  return {
    gamesPlayed: games.length,
    totalXP,
    highestXP,
    highestCash,
    bestBadge
  };
}; 