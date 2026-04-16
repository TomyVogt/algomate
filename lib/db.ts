import initSqlJs, { Database } from 'sql.js';
import { User, Profile, Match, Message, Flag } from './types';
import { hashPassword } from './auth';

let db: Database | null = null;

export async function initDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const saved = typeof window !== 'undefined' ? localStorage.getItem('algomate_db') : null;
  if (saved) {
    const data = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    db = new SQL.Database(data);
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt INTEGER
      );
      CREATE TABLE profiles (
        userId TEXT PRIMARY KEY,
        displayName TEXT,
        age INTEGER,
        bio TEXT,
        interests TEXT,
        location TEXT,
        lookingFor TEXT,
        values TEXT,
        hobbies TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
      CREATE TABLE matches (
        id TEXT PRIMARY KEY,
        userA TEXT NOT NULL,
        userB TEXT NOT NULL,
        score REAL,
        statusA TEXT DEFAULT 'pending',
        statusB TEXT DEFAULT 'pending',
        createdAt INTEGER,
        FOREIGN KEY (userA) REFERENCES users(id),
        FOREIGN KEY (userB) REFERENCES users(id)
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        matchId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt INTEGER,
        FOREIGN KEY (matchId) REFERENCES matches(id),
        FOREIGN KEY (senderId) REFERENCES users(id)
      );
      CREATE TABLE flags (
        id TEXT PRIMARY KEY,
        reporterId TEXT NOT NULL,
        reportedUserId TEXT NOT NULL,
        comment TEXT NOT NULL,
        createdAt INTEGER,
        resolved INTEGER DEFAULT 0,
        FOREIGN KEY (reporterId) REFERENCES users(id),
        FOREIGN KEY (reportedUserId) REFERENCES users(id)
      );
    `);
    await saveDB();
  }

  return db;
}

export async function saveDB(): Promise<void> {
  if (!db || typeof window === 'undefined') return;
  const data = db.export();
  const base64 = btoa(String.fromCharCode(...data));
  localStorage.setItem('algomate_db', base64);
}

export async function createUser(email: string, password: string, role: User['role'] = 'user'): Promise<User> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = Date.now();

  database.run(
    'INSERT INTO users (id, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, email, passwordHash, role, createdAt]
  );

  database.run(
    'INSERT INTO profiles (userId) VALUES (?)',
    [id]
  );

  await saveDB();
  return { id, email, passwordHash, role, createdAt };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const database = await initDB();
  const result = database.exec('SELECT * FROM users WHERE email = ?', [email]);
  if (!result.length || !result[0].values.length) return null;
  const [id, emailVal, passwordHash, role, createdAt] = result[0].values[0];
  return { id, email: emailVal as string, passwordHash: passwordHash as string, role: role as User['role'], createdAt: createdAt as number };
}

export async function getUserById(id: string): Promise<User | null> {
  const database = await initDB();
  const result = database.exec('SELECT * FROM users WHERE id = ?', [id]);
  if (!result.length || !result[0].values.length) return null;
  const [uid, email, passwordHash, role, createdAt] = result[0].values[0];
  return { id: uid as string, email: email as string, passwordHash: passwordHash as string, role: role as User['role'], createdAt: createdAt as number };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const database = await initDB();
  const result = database.exec('SELECT * FROM profiles WHERE userId = ?', [userId]);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  const cols = result[0].columns;
  const obj: Record<string, unknown> = {};
  cols.forEach((col, i) => { obj[col] = row[i]; });
  return {
    userId: obj.userId as string,
    displayName: obj.displayName as string || '',
    age: obj.age as number || 0,
    bio: obj.bio as string || '',
    interests: obj.interests ? JSON.parse(obj.interests as string) : [],
    location: obj.location as string || '',
    lookingFor: obj.lookingFor as string || '',
    values: obj.values ? JSON.parse(obj.values as string) : [],
    hobbies: obj.hobbies ? JSON.parse(obj.hobbies as string) : [],
  };
}

export async function updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
  const database = await initDB();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.displayName !== undefined) { fields.push('displayName = ?'); values.push(data.displayName); }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age); }
  if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
  if (data.interests !== undefined) { fields.push('interests = ?'); values.push(JSON.stringify(data.interests)); }
  if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
  if (data.lookingFor !== undefined) { fields.push('lookingFor = ?'); values.push(data.lookingFor); }
  if (data.values !== undefined) { fields.push('values = ?'); values.push(JSON.stringify(data.values)); }
  if (data.hobbies !== undefined) { fields.push('hobbies = ?'); values.push(JSON.stringify(data.hobbies)); }

  if (!fields.length) return;
  values.push(userId);
  database.run(`UPDATE profiles SET ${fields.join(', ')} WHERE userId = ?`, values);
  await saveDB();
}

export async function getMatchesForUser(userId: string): Promise<Match[]> {
  const database = await initDB();
  const result = database.exec(
    'SELECT * FROM matches WHERE userA = ? OR userB = ? ORDER BY createdAt DESC',
    [userId, userId]
  );
  if (!result.length) return [];
  return result[0].values.map((row) => {
    const cols = result[0].columns;
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Match;
  });
}

export async function createMatch(userA: string, userB: string, score: number): Promise<Match> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  database.run(
    'INSERT INTO matches (id, userA, userB, score, statusA, statusB, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userA, userB, score, 'pending', 'pending', createdAt]
  );
  await saveDB();
  return { id, userA, userB, score, statusA: 'pending', statusB: 'pending', createdAt };
}

export async function updateMatchStatus(matchId: string, userId: string, status: Match['statusA']): Promise<void> {
  const database = await initDB();
  const match = database.exec('SELECT * FROM matches WHERE id = ?', [matchId]);
  if (!match.length || !match[0].values.length) return;

  const row = match[0].values[0];
  const cols = match[0].columns;
  const obj: Record<string, unknown> = {};
  cols.forEach((col, i) => { obj[col] = row[i]; });

  if (obj.userA === userId) {
    database.run('UPDATE matches SET statusA = ? WHERE id = ?', [status, matchId]);
  } else if (obj.userB === userId) {
    database.run('UPDATE matches SET statusB = ? WHERE id = ?', [status, matchId]);
  }
  await saveDB();
}

export async function getMessages(matchId: string): Promise<Message[]> {
  const database = await initDB();
  const result = database.exec('SELECT * FROM messages WHERE matchId = ? ORDER BY createdAt ASC', [matchId]);
  if (!result.length) return [];
  return result[0].values.map((row) => {
    const cols = result[0].columns;
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as unknown as Message;
  });
}

export async function sendMessage(matchId: string, senderId: string, content: string): Promise<Message> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  database.run(
    'INSERT INTO messages (id, matchId, senderId, content, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, matchId, senderId, content, createdAt]
  );
  await saveDB();
  return { id, matchId, senderId, content, createdAt };
}

export async function createFlag(reporterId: string, reportedUserId: string, comment: string): Promise<Flag> {
  const database = await initDB();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  database.run(
    'INSERT INTO flags (id, reporterId, reportedUserId, comment, createdAt, resolved) VALUES (?, ?, ?, ?, ?, ?)',
    [id, reporterId, reportedUserId, comment, createdAt, 0]
  );
  await saveDB();
  return { id, reporterId, reportedUserId, comment, createdAt, resolved: false };
}

export async function getFlags(): Promise<Flag[]> {
  const database = await initDB();
  const result = database.exec('SELECT * FROM flags WHERE resolved = 0 ORDER BY createdAt DESC');
  if (!result.length) return [];
  return result[0].values.map((row) => {
    const cols = result[0].columns;
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return { ...obj, resolved: Boolean(obj.resolved) } as unknown as Flag;
  });
}

export async function resolveFlag(flagId: string): Promise<void> {
  const database = await initDB();
  database.run('UPDATE flags SET resolved = 1 WHERE id = ?', [flagId]);
  await saveDB();
}

export async function deleteUser(userId: string): Promise<void> {
  const database = await initDB();
  database.run('DELETE FROM messages WHERE matchId IN (SELECT id FROM matches WHERE userA = ? OR userB = ?)', [userId, userId]);
  database.run('DELETE FROM matches WHERE userA = ? OR userB = ?', [userId, userId]);
  database.run('DELETE FROM flags WHERE reporterId = ? OR reportedUserId = ?', [userId, userId]);
  database.run('DELETE FROM profiles WHERE userId = ?', [userId]);
  database.run('DELETE FROM users WHERE id = ?', [userId]);
  await saveDB();
}
