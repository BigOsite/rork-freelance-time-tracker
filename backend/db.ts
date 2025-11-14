// In-memory database implementation (no dependencies)
console.log('🗄️ Initializing in-memory database...');

// Store data in memory
const usersMap = new Map<string, User>();
const emailToUserId = new Map<string, string>();
const sessionsMap = new Map<string, Session>();
const userSessionsMap = new Map<string, Set<string>>();

console.log('✅ In-memory database initialized');
console.log('✅ Database schema initialized');

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

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

function hashPassword(password: string): string {
  let hash = password;
  for (let i = 0; i < 100; i++) {
    hash = simpleHash(hash + password + i.toString());
  }
  return hash;
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessionsMap.entries()) {
    if (session.expiresAt <= now) {
      sessionsMap.delete(token);
      const userSessions = userSessionsMap.get(session.userId);
      if (userSessions) {
        userSessions.delete(token);
      }
    }
  }
}

export const db = {
  async createUser(email: string, password: string, displayName: string): Promise<User> {
    if (emailToUserId.has(email)) {
      throw new Error('User already exists with this email');
    }

    const user: User = {
      id: generateUUID(),
      email,
      password: hashPassword(password),
      displayName,
      photoURL: null,
      createdAt: Date.now(),
    };

    usersMap.set(user.id, user);
    emailToUserId.set(email, user.id);
    
    return user;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const userId = emailToUserId.get(email);
    if (!userId) return null;
    return usersMap.get(userId) || null;
  },

  async findUserById(id: string): Promise<User | null> {
    return usersMap.get(id) || null;
  },

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const user = usersMap.get(id);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates };
    usersMap.set(id, updatedUser);
    
    // Update email index if email changed
    if (updates.email && updates.email !== user.email) {
      emailToUserId.delete(user.email);
      emailToUserId.set(updates.email, id);
    }
    
    return updatedUser;
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

  async createSession(userId: string): Promise<Session> {
    cleanExpiredSessions();
    
    const token = generateRandomToken();
    const session: Session = {
      userId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
    };

    sessionsMap.set(token, session);
    
    // Track sessions per user
    if (!userSessionsMap.has(userId)) {
      userSessionsMap.set(userId, new Set());
    }
    userSessionsMap.get(userId)!.add(token);
    
    return session;
  },

  async findSessionByToken(token: string): Promise<Session | null> {
    cleanExpiredSessions();
    
    const session = sessionsMap.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      return null;
    }
    
    return session;
  },

  async deleteSession(token: string): Promise<void> {
    const session = sessionsMap.get(token);
    if (session) {
      sessionsMap.delete(token);
      const userSessions = userSessionsMap.get(session.userId);
      if (userSessions) {
        userSessions.delete(token);
      }
    }
  },

  async deleteUserSessions(userId: string): Promise<void> {
    const userSessions = userSessionsMap.get(userId);
    if (userSessions) {
      for (const token of userSessions) {
        sessionsMap.delete(token);
      }
      userSessionsMap.delete(userId);
    }
  },

  async clearAll(): Promise<void> {
    sessionsMap.clear();
    usersMap.clear();
    emailToUserId.clear();
    userSessionsMap.clear();
  },

  async initializeDemoAccount(): Promise<void> {
    try {
      if (emailToUserId.has('demo@example.com')) {
        console.log('Demo account already exists');
        return;
      }

      const demoUser: User = {
        id: generateUUID(),
        email: 'demo@example.com',
        password: hashPassword('password123'),
        displayName: 'Demo User',
        photoURL: null,
        createdAt: Date.now(),
      };

      usersMap.set(demoUser.id, demoUser);
      emailToUserId.set(demoUser.email, demoUser.id);
      
      console.log('Demo account created successfully');
      console.log('Email: demo@example.com');
      console.log('Password: password123');
    } catch (error) {
      console.error('Error initializing demo account:', error);
    }
  },

  close(): void {
    // Nothing to close for in-memory database
  },
};
