'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, updateProfile, deleteUser } from '@/lib/db';
import { Profile } from '@/lib/types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tags, setTags] = useState({ interests: '', values: '', hobbies: '' });
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = document.cookie.split(';').find(c => c.trim().startsWith('algomate_token='))?.split('=')[1];
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);
      const data = await getProfile(payload.userId);
      if (data) {
        setProfile(data);
        setTags({
          interests: data.interests.join(', '),
          values: data.values.join(', '),
          hobbies: data.hobbies.join(', '),
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage('');
    const data: Partial<Profile> = {
      ...profile,
      interests: tags.interests.split(',').map(s => s.trim()).filter(Boolean),
      values: tags.values.split(',').map(s => s.trim()).filter(Boolean),
      hobbies: tags.hobbies.split(',').map(s => s.trim()).filter(Boolean),
    };
    await updateProfile(userId, data);
    setMessage('Profile saved!');
    setSaving(false);
  }

  async function handleDelete() {
    if (!userId) return;
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    await deleteUser(userId);
    document.cookie = 'algomate_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    router.push('/');
  }

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} />
      <div className="container-main max-w-2xl">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-6">My Profile</h1>
          {message && <p className="success bg-emerald-50 p-3 rounded-lg mb-4">{message}</p>}
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="label">Display Name</label>
              <input type="text" className="input" value={profile.displayName || ''} onChange={e => setProfile({ ...profile, displayName: e.target.value })} placeholder="How you want to be seen" />
            </div>
            <div className="form-group">
              <label className="label">Age</label>
              <input type="number" className="input" value={profile.age || ''} onChange={e => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })} placeholder="Your age" />
            </div>
            <div className="form-group">
              <label className="label">Location</label>
              <input type="text" className="input" value={profile.location || ''} onChange={e => setProfile({ ...profile, location: e.target.value })} placeholder="City or area" />
            </div>
            <div className="form-group">
              <label className="label">Looking For</label>
              <input type="text" className="input" value={profile.lookingFor || ''} onChange={e => setProfile({ ...profile, lookingFor: e.target.value })} placeholder="e.g. Activity partners, Deep conversations" />
            </div>
            <div className="form-group">
              <label className="label">Bio</label>
              <textarea className="input" value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell others about yourself..." rows={4} />
            </div>
            <div className="form-group">
              <label className="label">Interests (comma separated)</label>
              <input type="text" className="input" value={tags.interests} onChange={e => setTags({ ...tags, interests: e.target.value })} placeholder="e.g. hiking, cooking, gaming" />
            </div>
            <div className="form-group">
              <label className="label">Values (comma separated)</label>
              <input type="text" className="input" value={tags.values} onChange={e => setTags({ ...tags, values: e.target.value })} placeholder="e.g. honesty, loyalty, adventure" />
            </div>
            <div className="form-group">
              <label className="label">Hobbies (comma separated)</label>
              <input type="text" className="input" value={tags.hobbies} onChange={e => setTags({ ...tags, hobbies: e.target.value })} placeholder="e.g. chess, painting, running" />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
          </form>
        </div>
        <div className="card border-2" style={{ borderColor: '#EF4444', backgroundColor: '#fef2f2' }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#EF4444' }}>Danger Zone</h2>
          <p className="mb-4" style={{ color: '#666' }}>Permanently delete your account and all data.</p>
          <button className="btn-danger" onClick={handleDelete}>Delete My Account</button>
        </div>
      </div>
    </div>
  );
}