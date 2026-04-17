'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
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
  const [revealing, setRevealing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);

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

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  const currentMatch = matches.find(m => m.id === selected);
  const bothRevealed = currentMatch?.profileRevealedA && currentMatch?.profileRevealedB;
  const iRevealed = currentMatch ? (currentMatch.userA === userId ? currentMatch.profileRevealedA : currentMatch.profileRevealedB) : false;

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} />
      <div className="container-main">
        <h1 className="headline text-3xl font-bold mb-6">Messages</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ height: '70vh' }}>
          <div className="card overflow-y-auto">
            {matches.length === 0 && <p style={{ color: '#666' }}>No mutual matches yet. Go to the Matching Playground!</p>}
            {matches.map(m => (
              <div
                key={m.id}
                onClick={() => selectMatch(m.id)}
                className="p-3 rounded-lg cursor-pointer mb-1 transition-colors"
                style={{ background: selected === m.id ? '#dbeafe' : 'transparent' }}
              >
                <p className="font-semibold">{m.otherProfile?.displayName || 'Loading...'}</p>
                <p className="text-xs mt-1" style={{ color: '#666' }}>
                  {bothRevealed ? '✓ Profiles revealed' : iRevealed ? '✓ You revealed yours' : '🔒 Profiles hidden'}
                </p>
              </div>
            ))}
          </div>
          <div className="card md:col-span-3 flex flex-col">
            {!selected ? (
              <p className="text-center mt-12" style={{ color: '#666' }}>Select a conversation to start chatting</p>
            ) : (
              <>
                {currentMatch?.otherProfile && (
                  <div className="pb-4 mb-4" style={{ borderBottom: '1px solid #e5e5e5' }}>
                    <p className="font-bold text-lg">{currentMatch.otherProfile.displayName}</p>
                    <p className="text-sm" style={{ color: '#666' }}>{currentMatch.otherProfile.location} · Age {currentMatch.otherProfile.age}</p>
                    {!bothRevealed && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                        {!iRevealed ? (
                          <p className="text-sm">You have not revealed your profile yet. Once you both reveal, you will see each other&apos;s full profiles.</p>
                        ) : (
                          <p className="text-sm">Waiting for the other person to reveal their profile...</p>
                        )}
                      </div>
                    )}
                    {bothRevealed && currentMatch.otherProfile.bio && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#dcfce7' }}>
                        <p className="font-semibold text-sm">Bio:</p>
                        <p className="text-sm mt-1">{currentMatch.otherProfile.bio}</p>
                      </div>
                    )}
                    {!iRevealed && (
                      <button className="btn-primary mt-3 text-sm" onClick={handleRevealProfile} disabled={revealing}>
                        {revealing ? 'Revealing...' : 'Reveal My Profile'}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex" style={{ justifyContent: msg.senderId === userId ? 'flex-end' : 'flex-start' }}>
                      <span className="inline-block px-4 py-2 rounded-xl max-w-xs" style={{ background: msg.senderId === userId ? '#90c367' : '#e5e5e5', color: msg.senderId === userId ? 'white' : '#111' }}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                  />
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