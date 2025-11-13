import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let sqlite: Database.Database;
try {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory:', dataDir);
  }

  const dbPath = path.join(dataDir, 'hours-tracker.db');
  console.log('📊 Initializing database at:', dbPath);
  sqlite = new Database(dbPath);
  console.log('✅ Database connection established');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  throw error;
}

try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      displayName TEXT NOT NULL,
      photoURL TEXT,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
  `);
  console.log('✅ Database schema initialized');
} catch (error) {
  console.error('❌ Failed to create database schema:', error);
  throw error;
}

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
  const stmt = sqlite.prepare('DELETE FROM sessions WHERE expiresAt <= ?');
  stmt.run(now);
}

export const db = {
  async createUser(email: string, password: string, displayName: string): Promise<User> {
    const stmt = sqlite.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = stmt.get(email);
    
    if (existingUser) {
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

    const insertStmt = sqlite.prepare(
      'INSERT INTO users (id, email, password, displayName, photoURL, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(user.id, user.email, user.password, user.displayName, user.photoURL, user.createdAt);
    
    return user;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as User | undefined;
    return user || null;
  },

  async findUserById(id: string): Promise<User | null> {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id) as User | undefined;
    return user || null;
  },

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const user = await this.findUserById(id);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates };
    
    const stmt = sqlite.prepare(
      'UPDATE users SET email = ?, password = ?, displayName = ?, photoURL = ? WHERE id = ?'
    );
    stmt.run(updatedUser.email, updatedUser.password, updatedUser.displayName, updatedUser.photoURL, id);
    
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

    const stmt = sqlite.prepare(
      'INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)'
    );
    stmt.run(session.token, session.userId, session.createdAt, session.expiresAt);
    
    return session;
  },

  async findSessionByToken(token: string): Promise<Session | null> {
    cleanExpiredSessions();
    
    const stmt = sqlite.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?');
    const session = stmt.get(token, Date.now()) as Session | undefined;
    
    return session || null;
  },

  async deleteSession(token: string): Promise<void> {
    const stmt = sqlite.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },

  async deleteUserSessions(userId: string): Promise<void> {
    const stmt = sqlite.prepare('DELETE FROM sessions WHERE userId = ?');
    stmt.run(userId);
  },

  async clearAll(): Promise<void> {
    sqlite.exec('DELETE FROM sessions');
    sqlite.exec('DELETE FROM users');
  },

  async initializeDemoAccount(): Promise<void> {
    try {
      const stmt = sqlite.prepare('SELECT id FROM users WHERE email = ?');
      const demoExists = stmt.get('demo@example.com');
      
      if (demoExists) {
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

      const insertStmt = sqlite.prepare(
        'INSERT INTO users (id, email, password, displayName, photoURL, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run(demoUser.id, demoUser.email, demoUser.password, demoUser.displayName, demoUser.photoURL, demoUser.createdAt);
      
      console.log('Demo account created successfully');
      console.log('Email: demo@example.com');
      console.log('Password: password123');
    } catch (error) {
      console.error('Error initializing demo account:', error);
    }
  },

  close(): void {
    sqlite.close();
  },
};
