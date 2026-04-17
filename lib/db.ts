import { User, Profile, Match, Message, Flag } from './types';

function getStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

const USERS = 'algomate_users';
const PROFILES = 'algomate_profiles';
const MATCHES = 'algomate_matches';
const MESSAGES = 'algomate_messages';
const FLAGS = 'algomate_flags';

export async function initDB(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(USERS)) setStore(USERS, []);
  if (!localStorage.getItem(PROFILES)) setStore(PROFILES, []);
  if (!localStorage.getItem(MATCHES)) setStore(MATCHES, []);
  if (!localStorage.getItem(MESSAGES)) setStore(MESSAGES, []);
  if (!localStorage.getItem(FLAGS)) setStore(FLAGS, []);
}

export async function createUser(email: string, password: string, role: User['role'] = 'user'): Promise<User> {
  await initDB();
  const users = getStore<User>(USERS);
  const existing = users.find(u => u.email === email);
  if (existing) throw new Error('Email already exists');

  const { hashPassword } = await import('./auth');
  const passwordHash = await hashPassword(password);
  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role,
    createdAt: Date.now(),
  };
  users.push(user);
  setStore(USERS, users);

  const profiles = getStore<Profile>(PROFILES);
  profiles.push({ userId: user.id, displayName: '', age: 0, bio: '', location: '', friendSex: 'Male', friendMinAge: 18, friendMaxAge: 99, maxDistance: 150 });
  setStore(PROFILES, profiles);

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initDB();
  const users = getStore<User>(USERS);
  return users.find(u => u.email === email) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  await initDB();
  const users = getStore<User>(USERS);
  return users.find(u => u.id === id) || null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  await initDB();
  const profiles = getStore<Profile>(PROFILES);
  return profiles.find(p => p.userId === userId) || null;
}

export async function updateProfile(userId: string, data: Partial<Profile>): Promise<void> {
  await initDB();
  const profiles = getStore<Profile>(PROFILES);
  const idx = profiles.findIndex(p => p.userId === userId);
  if (idx === -1) return;
  profiles[idx] = { ...profiles[idx], ...data };
  setStore(PROFILES, profiles);
}

export async function getMatchesForUser(userId: string): Promise<Match[]> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  return matches.filter(m => m.userA === userId || m.userB === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createMatch(userA: string, userB: string, score: number): Promise<Match> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const match: Match = {
    id: crypto.randomUUID(),
    userA,
    userB,
    score,
    statusA: 'pending',
    statusB: 'pending',
    profileRevealedA: false,
    profileRevealedB: false,
    createdAt: Date.now(),
  };
  matches.push(match);
  setStore(MATCHES, matches);
  return match;
}

export async function createMutualMatch(userA: string, userB: string, score: number): Promise<Match> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const match: Match = {
    id: crypto.randomUUID(),
    userA,
    userB,
    score,
    statusA: 'match',
    statusB: 'match',
    profileRevealedA: true,
    profileRevealedB: true,
    createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  };
  matches.push(match);
  setStore(MATCHES, matches);
  return match;
}

export async function updateMatchStatus(matchId: string, userId: string, status: Match['statusA']): Promise<void> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx === -1) return;
  if (matches[idx].userA === userId) matches[idx].statusA = status;
  else if (matches[idx].userB === userId) matches[idx].statusB = status;
  setStore(MATCHES, matches);
}

export async function getMessages(matchId: string): Promise<Message[]> {
  await initDB();
  const messages = getStore<Message>(MESSAGES);
  return messages.filter(m => m.matchId === matchId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function sendMessage(matchId: string, senderId: string, content: string, createdAt?: number): Promise<Message> {
  await initDB();
  const messages = getStore<Message>(MESSAGES);
  const msg: Message = {
    id: crypto.randomUUID(),
    matchId,
    senderId,
    content,
    createdAt: createdAt || Date.now(),
  };
  messages.push(msg);
  setStore(MESSAGES, messages);
  return msg;
}

export async function createFlag(reporterId: string, reportedUserId: string, comment: string): Promise<Flag> {
  await initDB();
  const flags = getStore<Flag>(FLAGS);
  const flag: Flag = {
    id: crypto.randomUUID(),
    reporterId,
    reportedUserId,
    comment,
    createdAt: Date.now(),
    resolved: false,
  };
  flags.push(flag);
  setStore(FLAGS, flags);
  return flag;
}

export async function getFlags(): Promise<Flag[]> {
  await initDB();
  const flags = getStore<Flag>(FLAGS);
  return flags.filter(f => !f.resolved).sort((a, b) => b.createdAt - a.createdAt);
}

export async function resolveFlag(flagId: string): Promise<void> {
  await initDB();
  const flags = getStore<Flag>(FLAGS);
  const idx = flags.findIndex(f => f.id === flagId);
  if (idx === -1) return;
  flags[idx].resolved = true;
  setStore(FLAGS, flags);
}

export async function revealProfile(matchId: string, userId: string): Promise<void> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx === -1) return;
  if (matches[idx].userA === userId) matches[idx].profileRevealedA = true;
  else if (matches[idx].userB === userId) matches[idx].profileRevealedB = true;
  setStore(MATCHES, matches);
}

export async function getMutualMatches(userId: string): Promise<Match[]> {
  const all = await getMatchesForUser(userId);
  return all.filter(m => m.statusA === 'match' && m.statusB === 'match');
}

export async function handleMatchAction(matchId: string, userId: string, action: 'match' | 'decline' | 'disregard'): Promise<{ created: boolean; matched: boolean }> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const idx = matches.findIndex(m => m.id === matchId);
  if (idx !== -1) {
    const match = matches[idx];
    const isUserA = match.userA === userId;
    if (isUserA) {
      matches[idx].statusA = action;
    } else {
      matches[idx].statusB = action;
    }
    setStore(MATCHES, matches);
    return { created: false, matched: matches[idx].statusA === 'match' && matches[idx].statusB === 'match' };
  }
  const newMatch: Match = {
    id: matchId || crypto.randomUUID(),
    userA: userId,
    userB: '', // Will be set below
    score: 0,
    statusA: action,
    statusB: 'pending',
    profileRevealedA: false,
    profileRevealedB: false,
    createdAt: Date.now(),
  };
  matches.push(newMatch);
  setStore(MATCHES, matches);
  return { created: true, matched: false };
}

export async function createMatchWithMutualCheck(userA: string, userB: string, score: number): Promise<{ match: Match; isMutual: boolean }> {
  await initDB();
  const matches = getStore<Match>(MATCHES);
  const existingAsB = matches.find(m => m.userA === userB && m.userB === userA);
  if (existingAsB) {
    if (existingAsB.statusA === 'match') {
      existingAsB.statusB = 'match';
      existingAsB.score = score;
      existingAsB.profileRevealedB = true;
      setStore(MATCHES, matches);
      return { match: existingAsB, isMutual: true };
    }
  }
  const existingAsA = matches.find(m => m.userA === userA && m.userB === userB);
  if (existingAsA) {
    if (existingAsA.statusB === 'match') {
      existingAsA.statusA = 'match';
      existingAsA.score = score;
      existingAsA.profileRevealedA = true;
      setStore(MATCHES, matches);
      return { match: existingAsA, isMutual: true };
    }
    return { match: existingAsA, isMutual: false };
  }
  const match: Match = {
    id: crypto.randomUUID(),
    userA,
    userB,
    score,
    statusA: 'match',
    statusB: 'pending',
    profileRevealedA: true,
    profileRevealedB: false,
    createdAt: Date.now(),
  };
  matches.push(match);
  setStore(MATCHES, matches);
  return { match, isMutual: false };
}

export async function deleteUser(userId: string): Promise<void> {
  await initDB();
  let profiles = getStore<Profile>(PROFILES);
  profiles = profiles.filter(p => p.userId !== userId);
  setStore(PROFILES, profiles);

  let matches = getStore<Match>(MATCHES);
  const matchIds = matches.filter(m => m.userA === userId || m.userB === userId).map(m => m.id);
  matches = matches.filter(m => m.userA !== userId && m.userB !== userId);
  setStore(MATCHES, matches);

  let messages = getStore<Message>(MESSAGES);
  messages = messages.filter(m => !matchIds.includes(m.matchId));
  setStore(MESSAGES, messages);

  let flags = getStore<Flag>(FLAGS);
  flags = flags.filter(f => f.reporterId !== userId && f.reportedUserId !== userId);
  setStore(FLAGS, flags);

  let users = getStore<User>(USERS);
  users = users.filter(u => u.id !== userId);
  setStore(USERS, users);
}

export async function getAllUsersWithProfiles(excludeUserId: string): Promise<Array<{ id: string; profile: Profile }>> {
  await initDB();
  const profiles = getStore<Profile>(PROFILES);
  return profiles
    .filter(p => p.userId !== excludeUserId && p.displayName !== '')
    .map(p => ({ id: p.userId, profile: p }));
}