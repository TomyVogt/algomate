'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { getMutualMatches, getMessages, sendMessage, getProfile, revealProfile } from '@/lib/db';
import { Match, Message, Profile } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedMatch extends Match {
  otherProfile?: Profile;
}

export default function Messages() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [revealing, setRevealing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);

      const my = await getProfile(payload.userId);
      setMyProfile(my);

      const mutual = await getMutualMatches(payload.userId);
      const enriched: EnrichedMatch[] = await Promise.all(
        mutual.map(async (m) => {
          const otherId = m.userA === payload.userId ? m.userB : m.userA;
          const prof = await getProfile(otherId);
          return { ...m, otherProfile: prof || undefined };
        })
      );
      setMatches(enriched);
      setLoading(false);
    }
    load();
  }, [router]);

  async function selectMatch(matchId: string) {
    setSelected(matchId);
    const msgs = await getMessages(matchId);
    setMessages(msgs);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !userId || !newMessage.trim()) return;
    await sendMessage(selected, userId, newMessage.trim());
    const msgs = await getMessages(selected);
    setMessages(msgs);
    setNewMessage('');
  }

  async function handleRevealProfile() {
    if (!selected || !userId) return;
    setRevealing(true);
    await revealProfile(selected, userId);
    const updated = matches.map(m => {
      if (m.id === selected) {
        const isA = m.userA === userId;
        return { ...m, [isA ? 'profileRevealedA' : 'profileRevealedB']: true };
      }
      return m;
    });
    setMatches(updated);
    setRevealing(false);
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  const currentMatch = matches.find(m => m.id === selected);
  const bothRevealed = currentMatch?.profileRevealedA && currentMatch?.profileRevealedB;
  const iRevealed = currentMatch ? (currentMatch.userA === userId ? currentMatch.profileRevealedA : currentMatch.profileRevealedB) : false;

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
            {matches.map(m => (
              <div key={m.id} onClick={() => selectMatch(m.id)} style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', background: selected === m.id ? '#eef2ff' : 'transparent', marginBottom: '4px' }}>
                <strong>{m.otherProfile?.displayName || 'Loading...'}</strong>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                  {bothRevealed ? '✓ Profiles revealed' : iRevealed ? '✓ You revealed yours' : '🔒 Profiles hidden'}
                </div>
              </div>
            ))}
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>Select a conversation to start chatting</p>
            ) : (
              <>
                {currentMatch?.otherProfile && (
                  <div style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
                    <strong>{currentMatch.otherProfile.displayName}</strong>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{currentMatch.otherProfile.location} · Age {currentMatch.otherProfile.age}</p>
                    {!bothRevealed && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#fef9e7', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {!iRevealed ? (
                          <p>You have not revealed your profile yet. Once you both reveal, you'll see each other's full profiles.</p>
                        ) : (
                          <p>Waiting for the other person to reveal their profile...</p>
                        )}
                      </div>
                    )}
                    {bothRevealed && currentMatch.otherProfile.bio && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#eafaf1', borderRadius: '6px' }}>
                        <strong>Bio:</strong> {currentMatch.otherProfile.bio}
                      </div>
                    )}
                    {!iRevealed && (
                      <button className="btn-primary" style={{ marginTop: '12px', fontSize: '0.9rem' }} onClick={handleRevealProfile} disabled={revealing}>
                        {revealing ? 'Revealing...' : 'Reveal My Profile'}
                      </button>
                    )}
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