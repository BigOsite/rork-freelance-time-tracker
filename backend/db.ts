import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password: string;
  displayName: string;
  photoURL: string | null;
  createdAt: number;
}

export interface Session {
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

const DB_KEY_USERS = 'backend_users';
const DB_KEY_SESSIONS = 'backend_sessions';

// In-memory cache for faster access
let usersCache: User[] | null = null;
let sessionsCache: Session[] | null = null;

// Hash password using crypto
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Load users from storage
async function loadUsers(): Promise<User[]> {
  if (usersCache !== null) {
    return usersCache;
  }

  try {
    const data = await AsyncStorage.getItem(DB_KEY_USERS);
    usersCache = data ? JSON.parse(data) : [];
    return usersCache;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// Save users to storage
async function saveUsers(users: User[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DB_KEY_USERS, JSON.stringify(users));
    usersCache = users;
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

// Load sessions from storage
async function loadSessions(): Promise<Session[]> {
  if (sessionsCache !== null) {
    return sessionsCache;
  }

  try {
    const data = await AsyncStorage.getItem(DB_KEY_SESSIONS);
    sessionsCache = data ? JSON.parse(data) : [];
    return sessionsCache;
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

// Save sessions to storage
async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DB_KEY_SESSIONS, JSON.stringify(sessions));
    sessionsCache = sessions;
  } catch (error) {
    console.error('Error saving sessions:', error);
    throw error;
  }
}

// Clean expired sessions
async function cleanExpiredSessions(): Promise<void> {
  const sessions = await loadSessions();
  const now = Date.now();
  const validSessions = sessions.filter(s => s.expiresAt > now);
  
  if (validSessions.length !== sessions.length) {
    await saveSessions(validSessions);
  }
}

// Database operations
export const db = {
  // User operations
  async createUser(email: string, password: string, displayName: string): Promise<User> {
    const users = await loadUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists with this email');
    }

    const user: User = {
      id: crypto.randomUUID(),
      email,
      password: hashPassword(password),
      displayName,
      photoURL: null,
      createdAt: Date.now(),
    };

    users.push(user);
    await saveUsers(users);
    
    return user;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const users = await loadUsers();
    return users.find(u => u.email === email) || null;
  },

  async findUserById(id: string): Promise<User | null> {
    const users = await loadUsers();
    return users.find(u => u.id === id) || null;
  },

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return null;
    }

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
    };

    await saveUsers(users);
    return users[userIndex];
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return null;
    }

    return user;
  },

  // Session operations
  async createSession(userId: string): Promise<Session> {
    await cleanExpiredSessions();
    
    const sessions = await loadSessions();
    const token = generateToken();
    const session: Session = {
      userId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    };

    sessions.push(session);
    await saveSessions(sessions);
    
    return session;
  },

  async findSessionByToken(token: string): Promise<Session | null> {
    await cleanExpiredSessions();
    
    const sessions = await loadSessions();
    const session = sessions.find(s => s.token === token);
    
    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  },

  async deleteSession(token: string): Promise<void> {
    const sessions = await loadSessions();
    const filteredSessions = sessions.filter(s => s.token !== token);
    await saveSessions(filteredSessions);
  },

  async deleteUserSessions(userId: string): Promise<void> {
    const sessions = await loadSessions();
    const filteredSessions = sessions.filter(s => s.userId !== userId);
    await saveSessions(filteredSessions);
  },

  // Clear all data (for testing/reset)
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(DB_KEY_USERS);
    await AsyncStorage.removeItem(DB_KEY_SESSIONS);
    usersCache = null;
    sessionsCache = null;
  },
};
