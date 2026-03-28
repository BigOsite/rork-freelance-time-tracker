import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('🗄️ Initializing SQLite database...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('✅ SQLite database opened at:', dbPath);

db.exec(`
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

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    hourlyRate REAL NOT NULL,
    color TEXT,
    settings TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    jobId TEXT NOT NULL,
    startTime INTEGER NOT NULL,
    endTime INTEGER,
    note TEXT,
    breaks TEXT,
    isOnBreak INTEGER DEFAULT 0,
    paidInPeriodId TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pay_periods (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    jobId TEXT NOT NULL,
    startDate INTEGER NOT NULL,
    endDate INTEGER NOT NULL,
    totalDuration REAL NOT NULL,
    totalEarnings REAL NOT NULL,
    isPaid INTEGER DEFAULT 0,
    paidDate INTEGER,
    timeEntryIds TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
  CREATE INDEX IF NOT EXISTS idx_jobs_userId ON jobs(userId);
  CREATE INDEX IF NOT EXISTS idx_time_entries_userId ON time_entries(userId);
  CREATE INDEX IF NOT EXISTS idx_time_entries_jobId ON time_entries(jobId);
  CREATE INDEX IF NOT EXISTS idx_pay_periods_userId ON pay_periods(userId);
  CREATE INDEX IF NOT EXISTS idx_pay_periods_jobId ON pay_periods(jobId);
`);

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
  const deleteStmt = db.prepare('DELETE FROM sessions WHERE expiresAt <= ?');
  deleteStmt.run(now);
}

export const database = {
  async createUser(email: string, password: string, displayName: string): Promise<User> {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
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

    const stmt = db.prepare(
      'INSERT INTO users (id, email, password, displayName, photoURL, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(user.id, user.email, user.password, user.displayName, user.photoURL, user.createdAt);
    
    return user;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;
    return row || null;
  },

  async findUserById(id: string): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    return row || null;
  },

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const user = await this.findUserById(id);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates };
    
    const stmt = db.prepare(
      'UPDATE users SET email = ?, password = ?, displayName = ?, photoURL = ? WHERE id = ?'
    );
    stmt.run(
      updatedUser.email,
      updatedUser.password,
      updatedUser.displayName,
      updatedUser.photoURL,
      id
    );
    
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

    const stmt = db.prepare(
      'INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)'
    );
    stmt.run(session.token, session.userId, session.createdAt, session.expiresAt);
    
    return session;
  },

  async findSessionByToken(token: string): Promise<Session | null> {
    cleanExpiredSessions();
    
    const stmt = db.prepare('SELECT * FROM sessions WHERE token = ? AND expiresAt > ?');
    const row = stmt.get(token, Date.now()) as any;
    return row || null;
  },

  async deleteSession(token: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
  },

  async deleteUserSessions(userId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM sessions WHERE userId = ?');
    stmt.run(userId);
  },

  async clearAll(): Promise<void> {
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM jobs');
    db.exec('DELETE FROM time_entries');
    db.exec('DELETE FROM pay_periods');
  },

  async initializeDemoAccount(): Promise<void> {
    try {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');
      if (existing) {
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

      const stmt = db.prepare(
        'INSERT INTO users (id, email, password, displayName, photoURL, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      );
      stmt.run(
        demoUser.id,
        demoUser.email,
        demoUser.password,
        demoUser.displayName,
        demoUser.photoURL,
        demoUser.createdAt
      );
      
      console.log('Demo account created successfully');
      console.log('Email: demo@example.com');
      console.log('Password: password123');
    } catch (error) {
      console.error('Error initializing demo account:', error);
    }
  },

  close(): void {
    db.close();
  },

  prepare(sql: string) {
    return db.prepare(sql);
  },

  exec(sql: string) {
    return db.exec(sql);
  },
};
