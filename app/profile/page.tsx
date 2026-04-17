'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, updateProfile, deleteUser } from '@/lib/db';
import { Profile } from '@/lib/types';

function parseBio(bio: string): Partial<Profile> {
  const lower = bio.toLowerCase();
  const words = bio.split(/\s+/);

  const interestKeywords = ['hiking', 'reading', 'gaming', 'cooking', 'sports', 'music', 'movies', 'travel', 'photography', 'art', 'painting', 'writing', 'dancing', 'yoga', 'running', 'cycling', 'swimming', 'skiing', 'surfing', 'climbing', 'fishing', 'hunting', 'birdwatching', 'gardening', 'meditation', 'movies', 'series', 'board games', 'video games', 'chess', 'puzzles', 'coding', 'programming', 'sci-fi', 'fantasy', 'romance', 'thriller', 'horror', 'documentary', 'comedy', 'anime', 'manga', 'crafts', 'sewing', 'knitting', 'pottery', 'woodworking', 'metalwork', 'electronics', 'robotics'];

  const valueKeywords = ['honesty', 'loyalty', 'respect', 'kindness', 'courage', 'patience', 'humor', 'ambition', 'creativity', 'curiosity', 'independence', 'family', 'friendship', 'adventure', 'growth', 'learning', 'success', 'wealth', 'health', 'fitness', 'spirituality', 'philosophy', 'nature', 'community', 'tradition', 'freedom', 'justice', 'fairness', 'integrity', 'wisdom'];

  const hobbyKeywords = ['hiking', 'reading', 'gaming', 'cooking', 'sports', 'music', 'movies', 'travel', 'photography', 'art', 'painting', 'writing', 'dancing', 'yoga', 'running', 'cycling', 'swimming', 'skiing', 'surfing', 'climbing', 'fishing', 'gardening', 'chess', 'puzzles', 'coding', 'crafts', 'sewing', 'knitting', 'pottery', 'woodworking'];

  const interests: string[] = [];
  const values: string[] = [];
  const hobbies: string[] = [];

  interestKeywords.forEach(k => { if (lower.includes(k) && !interests.includes(k)) interests.push(k); });
  valueKeywords.forEach(k => { if (lower.includes(k) && !values.includes(k)) values.push(k); });
  hobbyKeywords.forEach(k => { if (lower.includes(k) && !hobbies.includes(k)) hobbies.push(k); });

  let location = '';
  let age = 0;
  let lookingFor = '';

  const locationMatch = bio.match(/location[:\s]+([A-Za-z\s]+?)(?:\.|$|,)/i);
  if (locationMatch) location = locationMatch[1].trim();

  const ageMatch = bio.match(/age[:\s]+(\d+)/i);
  if (ageMatch) age = parseInt(ageMatch[1]);

  const lookingMatch = bio.match(/looking for[:\s]+([^\.]+)/i);
  if (lookingMatch) lookingFor = lookingMatch[1].trim();

  return { interests, values, hobbies, location, age, lookingFor };
}

export default function ProfilePage() {
  const [bio, setBio] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
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
        const fullBio = [
          data.bio,
          data.displayName ? `Name: ${data.displayName}` : '',
          data.age ? `Age: ${data.age}` : '',
          data.location ? `Location: ${data.location}` : '',
          data.lookingFor ? `Looking for: ${data.lookingFor}` : '',
          data.interests.length ? `Interests: ${data.interests.join(', ')}` : '',
          data.hobbies.length ? `Hobbies: ${data.hobbies.join(', ')}` : '',
          data.values.length ? `Values: ${data.values.join(', ')}` : '',
        ].filter(Boolean).join('\n');
        setBio(fullBio);
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

    const lines = bio.split('\n');
    let displayName = '';
    let bioText = bio;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('name:')) displayName = line.split(':')[1].trim();
    }
    bioText = lines.filter(l => !l.toLowerCase().startsWith('name:') && !l.toLowerCase().startsWith('age:') && !l.toLowerCase().startsWith('location:') && !l.toLowerCase().startsWith('looking for:') && !l.toLowerCase().startsWith('interests:') && !l.toLowerCase().startsWith('hobbies:') && !l.toLowerCase().startsWith('values:')).join('\n').trim();

    const parsed = parseBio(bio);

    await updateProfile(userId, {
      displayName: displayName || 'User',
      bio: bioText,
      ...parsed
    });

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
              <label className="label">Tell others about yourself — your story, interests, values and what you're looking for</label>
              <textarea
                className="input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={'Name: YourName\nAge: 25\nLocation: Berlin\nLooking for: Friends for adventures\n\nI am a passionate developer who loves exploring new technologies. In my free time I enjoy hiking in the mountains and reading sci-fi novels. I value honesty and loyalty above all. Looking for friends who share similar interests and enjoy deep conversations about philosophy and technology.'}
                rows={12}
              />
              <p className="text-sm mt-2" style={{ color: '#666' }}>
                Tip: You can include keywords like "hiking", "gaming", "honesty", "cooking" etc. in your bio — they will be automatically detected for matching!
              </p>
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