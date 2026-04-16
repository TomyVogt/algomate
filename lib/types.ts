export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'mod';
  createdAt: number;
}

export interface Profile {
  userId: string;
  displayName: string;
  age: number;
  bio: string;
  interests: string[];
  location: string;
  lookingFor: string;
  values: string[];
  hobbies: string[];
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  score: number;
  statusA: 'pending' | 'match' | 'decline' | 'disregard';
  statusB: 'pending' | 'match' | 'decline' | 'disregard';
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
