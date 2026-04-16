'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { getMatchesForUser, getMessages, sendMessage, getProfile, getUserById } from '@/lib/db';
import { Match, Message, Profile } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Messages() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [matchData, setMatchData] = useState<Match | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);

      const userMatches = await getMatchesForUser(payload.userId);
      const mutual = userMatches.filter(m =>
        (m.statusA === 'match' && m.statusB === 'match')
      );
      setMatches(mutual);
      setLoading(false);
    }
    load();
  }, [router]);

  async function selectMatch(matchId: string) {
    setSelected(matchId);
    const msgs = await getMessages(matchId);
    setMessages(msgs);
    const match = matches.find(m => m.id === matchId);
    setMatchData(match || null);
    if (match && userId) {
      const otherId = match.userA === userId ? match.userB : match.userA;
      const prof = await getProfile(otherId);
      setOtherProfile(prof);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !userId || !newMessage.trim()) return;
    await sendMessage(selected, userId, newMessage.trim());
    const msgs = await getMessages(selected);
    setMessages(msgs);
    setNewMessage('');
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/profile">My Profile</Link>
        <Link href="/matching-playground">Matching Playground</Link>
        <Link href="/messages" className="active">Messages</Link>
      </nav>
      <div className="container">
        <h1>Messages</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', height: '70vh' }}>
          <div className="card" style={{ overflowY: 'auto' }}>
            {matches.length === 0 && <p style={{ color: '#666' }}>No mutual matches yet. Go to the Matching Playground!</p>}
            {matches.map(m => {
              const otherId = m.userA === userId ? m.userB : m.userA;
              return (
                <div key={m.id} onClick={() => selectMatch(m.id)} style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', background: selected === m.id ? '#eef2ff' : 'transparent', marginBottom: '4px' }}>
                  <strong>{otherProfile && m.id === selected ? otherProfile.displayName : 'Loading...'}</strong>
                </div>
              );
            })}
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>Select a conversation to start chatting</p>
            ) : (
              <>
                {otherProfile && (
                  <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
                    <strong>{otherProfile.displayName}</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{otherProfile.location} · Age {otherProfile.age}</p>
                  </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ textAlign: msg.senderId === userId ? 'right' : 'left', marginBottom: '8px' }}>
                      <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px', background: msg.senderId === userId ? '#6c5ce7' : '#eee', color: msg.senderId === userId ? 'white' : 'black' }}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." />
                  <button type="submit" className="btn-primary">Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
