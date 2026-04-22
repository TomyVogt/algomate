'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getMatchesForUser, getMessages, sendMessage, getProfile, revealProfile, createFlag, getUserById, getUnreadCount, markMessagesAsRead } from '@/lib/db';
import { Match, Message, Profile, User } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedMatch extends Match {
  otherProfile?: Profile;
  otherUser?: User;
  unreadCount?: number;
}

interface OpenChat {
  matchId: string;
  messages: Message[];
  newMessage: string;
  showProfileInfo: boolean;
  unread: number;
  reporting: boolean;
  reportComment: string;
  closing: boolean;
}

export default function Messages() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [openChats, setOpenChats] = useState<Map<string, OpenChat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();
  const msgEndRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadMatches = async (uid: string) => {
    const all = await getMatchesForUser(uid);
    const enriched: EnrichedMatch[] = await Promise.all(
      all.map(async (m) => {
        const otherId = m.userA === uid ? m.userB : m.userA;
        const prof = await getProfile(otherId);
        const user = await getUserById(otherId);
        const unread = await getUnreadCount(m.id, uid);
        return { ...m, otherProfile: prof || undefined, otherUser: user || undefined, unreadCount: unread };
      })
    );
    setMatches(enriched);
    return enriched;
  };

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);
      await loadMatches(payload.userId);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (userId) {
        await loadMatches(userId);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (userId) {
        const updated = new Map(openChats);
        for (const [matchId] of updated) {
          const msgs = await getMessages(matchId);
          const chat = updated.get(matchId);
          if (chat) {
            updated.set(matchId, { ...chat, messages: msgs });
            const prevUnread = chat.unread;
            if (prevUnread > 0) {
              await markMessagesAsRead(matchId, userId!);
              updated.set(matchId, { ...updated.get(matchId)!, unread: 0 });
            }
          }
        }
        setOpenChats(new Map(updated));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [userId, openChats]);

  async function openChat(matchId: string) {
    const msgs = await getMessages(matchId);
    const match = matches.find(m => m.id === matchId);
    const unread = match?.unreadCount || 0;
    if (unread > 0 && userId) {
      await markMessagesAsRead(matchId, userId);
      await loadMatches(userId);
    }
    setOpenChats(new Map([[matchId, { matchId, messages: msgs, newMessage: '', showProfileInfo: false, unread: 0, reporting: false, reportComment: '', closing: false }]]));
  }

  function closeChat(matchId: string) {
    updateChatField(matchId, 'closing', true);
    setTimeout(() => {
      setOpenChats(prev => {
        const next = new Map(prev);
        next.delete(matchId);
        return next;
      });
    }, 200);
  }

  function updateChatField(matchId: string, field: keyof OpenChat, value: unknown) {
    setOpenChats(prev => {
      const next = new Map(prev);
      const chat = next.get(matchId);
      if (chat) next.set(matchId, { ...chat, [field]: value });
      return next;
    });
  }

  async function handleSend(matchId: string) {
    const chat = openChats.get(matchId);
    if (!chat || !userId || !chat.newMessage.trim()) return;
    await sendMessage(matchId, userId, chat.newMessage.trim());
    const msgs = await getMessages(matchId);
    updateChatField(matchId, 'messages', msgs);
    updateChatField(matchId, 'newMessage', '');
  }

  async function handleRevealProfile(matchId: string) {
    if (!userId) return;
    await revealProfile(matchId, userId);
    await loadMatches(userId);
  }

  async function handleReport(matchId: string, otherId: string, reportComment: string) {
    if (!userId || reportComment.trim().length < 50) return;
    await createFlag(userId, otherId, reportComment.trim());
    await loadMatches(userId);
  }

  useEffect(() => {
    for (const [, chat] of openChats) {
      const el = msgEndRefs.current.get(chat.matchId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [openChats]);

  if (loading) {
    return (
      <div className="min-h-screen min-h-100dvh bg-white flex flex-col">
        <Nav userRole={userRole} unreadMessages={matches.filter(m => m.statusA === 'match' && m.statusB === 'match').reduce((sum, m) => sum + (m.unreadCount || 0), 0)} />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-100dvh bg-white flex flex-col relative">
      <Nav userRole={userRole} unreadMessages={matches.filter(m => m.statusA === 'match' && m.statusB === 'match').reduce((sum, m) => sum + (m.unreadCount || 0), 0)} />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 shrink-0">
          <h1 className="headline text-3xl font-bold mb-4">Messages</h1>
        </div>
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 px-6 shrink-0">
            {matches.filter(m => m.statusA === 'match' && m.statusB === 'match').map(m => {
              const isMutual = true;
              const isOpen = openChats.has(m.id);
              const unread = m.unreadCount || 0;
              return (
                <button
                  key={m.id}
                  onClick={() => openChat(m.id)}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                  style={{
                    background: isOpen ? '#90c367' : '#dcfce7',
                    color: isOpen ? 'white' : '#166534',
                    border: '1px solid ' + (isOpen ? '#90c367' : '#86efac')
                  }}
                >
                  <span>{m.otherProfile?.displayName || 'User'}</span>
                  {unread > 0 && !isOpen && (
                    <span className="rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ background: '#f97316', color: 'white' }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex-1 flex items-center justify-center px-6 pb-6 min-h-0">
          {matches.filter(m => m.statusA === 'match' && m.statusB === 'match').length === 0 && (
            <p style={{ color: '#666' }}>No matches yet. Keep exploring the Matching Playground!</p>
          )}
          {matches.filter(m => m.statusA === 'match' && m.statusB === 'match').length > 0 && openChats.size === 0 && (
            <p style={{ color: '#666' }}>Select a conversation above to start chatting</p>
          )}
        </div>
      </div>

      {Array.from(openChats.entries()).map(([matchId, chat]) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || !match.otherProfile) return null;
        const prof = match.otherProfile;
        const isMutual = match.statusA === 'match' && match.statusB === 'match';
        const bothRevealed = match.profileRevealedA && match.profileRevealedB;
        const iRevealed = match.userA === userId ? match.profileRevealedA : match.profileRevealedB;
        const headerBg = isMutual ? '#90c367' : '#9ca3af';
        const otherId = match.userA === userId ? match.userB : match.userA;
        return (
          <div
            key={matchId}
            className="fixed bottom-4 right-4 z-50 card flex flex-col transition-all duration-200"
            style={{
              width: '340px',
              maxHeight: '480px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              opacity: chat.closing ? 0 : 1,
              transform: chat.closing ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <div className="p-3 flex flex-col gap-2 shrink-0" style={{ background: headerBg }}>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'white' }}>{prof.displayName}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {prof.location && `${prof.location} · `}{prof.age}
                  </p>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                  {!iRevealed && (
                    <button
                      className="text-xs px-2 py-1 rounded font-medium"
                      style={{ background: 'white', color: '#166534' }}
                      onClick={() => handleRevealProfile(matchId)}
                    >
                      Reveal full profile
                    </button>
                  )}
                  {bothRevealed && (
                    <span className="text-xs font-medium" style={{ color: 'white' }}>Full profile revealed</span>
                  )}
                  {!chat.reporting ? (
                    <button
                      className="text-xs px-2 py-1 rounded border font-medium"
                      style={{ borderColor: 'white', color: 'white', background: 'transparent' }}
                      onClick={() => updateChatField(matchId, 'reporting', true)}
                    >
                      Report
                    </button>
                  ) : null}
                  <button
                    title="Close Chat"
                    className="text-lg font-bold leading-none"
                    style={{ color: '#ef4444' }}
                    onClick={() => closeChat(matchId)}
                  >
                    ×
                  </button>
                </div>
              </div>
              {chat.reporting && (
                <div className="p-2 rounded" style={{ background: '#fef2f2', border: '1px solid #EF4444' }}>
                  <p className="text-xs mb-1 font-medium" style={{ color: '#EF4444' }}>Report (50+ chars required):</p>
                  <textarea
                    className="input bg-white w-full text-xs"
                    value={chat.reportComment}
                    onChange={e => updateChatField(matchId, 'reportComment', e.target.value)}
                    rows={2}
                    placeholder="Describe the issue..."
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      className="btn-danger text-xs"
                      disabled={chat.reportComment.trim().length < 50}
                      onClick={async () => {
                        await handleReport(matchId, otherId, chat.reportComment);
                        updateChatField(matchId, 'reporting', false);
                        updateChatField(matchId, 'reportComment', '');
                      }}
                    >
                      Send Report
                    </button>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => {
                        updateChatField(matchId, 'reporting', false);
                        updateChatField(matchId, 'reportComment', '');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {bothRevealed && (
                <div
                  className="px-3 py-2 border-b cursor-pointer shrink-0"
                  style={{ borderColor: '#e5e5e5', backgroundColor: chat.showProfileInfo ? '#f0fdf4' : 'var(--color-secondary)' }}
                  onClick={() => updateChatField(matchId, 'showProfileInfo', !chat.showProfileInfo)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium" style={{ color: chat.showProfileInfo ? '#166534' : 'white' }}>Profile Info</span>
                    <span style={{ color: chat.showProfileInfo ? '#666' : 'rgba(255,255,255,0.8)', fontSize: '10px' }}>{chat.showProfileInfo ? '▲' : '▼'}</span>
                  </div>
                  {chat.showProfileInfo && (
                    <div className="mt-2 p-2 rounded text-xs" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                      <div><span className="font-medium">Bio:</span> {prof.bio || 'No bio'}</div>
                      <div><span className="font-medium">Looking for:</span> {prof.friendSex} friends, age {prof.friendMinAge}-{prof.friendMaxAge}</div>
                      <div><span className="font-medium">Location:</span> {prof.location || 'Unknown'}</div>
                      <div><span className="font-medium">Max Distance:</span> {prof.maxDistance} km</div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {chat.messages.length === 0 && (
                  <p className="text-center text-xs" style={{ color: '#666' }}>No messages yet. Say hello!</p>
                )}
                {chat.messages.map(msg => (
                  <div key={msg.id} className="flex" style={{ justifyContent: msg.senderId === userId ? 'flex-end' : 'flex-start' }}>
                    <span
                      className="inline-block px-3 py-1.5 rounded-xl text-xs max-w-xs"
                      style={{
                        background: msg.senderId === userId ? '#90c367' : '#e5e5e5',
                        color: msg.senderId === userId ? 'white' : '#111',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </span>
                  </div>
                ))}
                <div ref={el => { if (el) msgEndRefs.current.set(matchId, el); }} />
              </div>
              <form
                onSubmit={e => { e.preventDefault(); handleSend(matchId); }}
                className="p-3 border-t shrink-0"
                style={{ borderColor: '#e5e5e5' }}
              >
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '12px', borderTop: '1px solid #e5e5e5' }}>
                  <input
                    style={{ flex: 1, height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                    value={chat.newMessage}
                    onChange={e => updateChatField(matchId, 'newMessage', e.target.value)}
                    placeholder="Message..."
                  />
                  <button
                    type="submit"
                    style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#90c367', color: 'white', cursor: 'pointer' }}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}
