export interface Profile {
  userId: string;
  displayName: string;
  age: number;
  bio: string;
  location: string;
  latitude?: number;
  longitude?: number;
  friendSex: 'Male' | 'Female' | 'Non-Binary';
  friendMinAge: number;
  friendMaxAge: number;
  maxDistance: number;
}

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  state?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'mod';
  createdAt: number;
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  score: number;
  statusA: 'pending' | 'match' | 'decline' | 'disregard';
  statusB: 'pending' | 'match' | 'decline' | 'disregard';
  profileRevealedA: boolean;
  profileRevealedB: boolean;
  createdAt: number;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export interface Flag {
  id: string;
  reporterId: string;
  reportedUserId: string;
  comment: string;
  createdAt: number;
  resolved: boolean;
}