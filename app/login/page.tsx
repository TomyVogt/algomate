'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { signToken, verifyPassword } from '@/lib/auth';
import { getUserByEmail, createUser, updateProfile } from '@/lib/db';
import { Profile } from '@/lib/types';

const QUICK_USERS = [
  { name: 'Marcus', email: 'Marcus@algomate.local' },
  { name: 'Leonie', email: 'Leonie@algomate.local' },
  { name: 'Sophia', email: 'Sophia@algomate.local' },
  { name: 'Julian', email: 'Julian@algomate.local' },
  { name: 'Emilia', email: 'Emilia@algomate.local' },
  { name: 'Theodor', email: 'Theodor@algomate.local' },
  { name: 'Lukas', email: 'Lukas@algomate.local' },
  { name: 'Noah', email: 'Noah@algomate.local' },
  { name: 'Helena', email: 'Helena@algomate.local' },
  { name: 'Felix', email: 'Felix@algomate.local' },
  { name: 'Admin', email: 'admin@algomate.local' },
];

const TEST_USER_PROFILES: Record<string, Omit<Profile, 'userId'>> = {
  'Marcus@algomate.local': { displayName: 'Marcus', age: 28, location: 'Zurich', latitude: 47.3769, longitude: 8.5417, bio: 'Software architect who loves hiking through the Swiss Alps and reading philosophy. Particularly drawn to Stoicism and modern existentialism. Values honesty, intellectual curiosity, and meaningful conversations.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 100 },
  'Leonie@algomate.local': { displayName: 'Leonie', age: 24, location: 'Geneva', latitude: 46.2044, longitude: 6.1432, bio: 'Musician and music producer in Geneva creative scene. Plays guitar and keyboard, working on electronic music projects. Enjoys exploring hidden city spots and photography.', gender: 'female', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 80 },
  'Sophia@algomate.local': { displayName: 'Sophia', age: 31, location: 'Bern', latitude: 46.9480, longitude: 7.4474, bio: 'Wildlife photographer who travels to remote locations. Loves extreme sports - paragliding, white-water rafting, rock climbing. Looking for adventurous friends.', gender: 'female', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 200 },
  'Julian@algomate.local': { displayName: 'Julian', age: 35, location: 'Basel', latitude: 47.5596, longitude: 7.5886, bio: 'Librarian and historian with a passion for board games. Hosts game nights playing everything from ancient strategy games to modern euros. Writes historical fiction in spare time.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 60 },
  'Emilia@algomate.local': { displayName: 'Emilia', age: 29, location: 'Lausanne', latitude: 46.5197, longitude: 6.6323, bio: 'Frontend developer at a Lausanne tech startup. By night works on indie game projects. Passionate about technology, gaming culture, and building things that matter.', gender: 'female', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 50 },
  'Theodor@algomate.local': { displayName: 'Theodor', age: 42, location: 'Lucerne', latitude: 47.0502, longitude: 8.3093, bio: 'Chef and food critic who runs a small restaurant. Cooking is life. Also loves classical music, opera, and theater. Looking for friends who appreciate good food and cultural outings.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 80 },
  'Lukas@algomate.local': { displayName: 'Lukas', age: 26, location: 'Winterthur', latitude: 47.4979, longitude: 8.7243, bio: 'Fitness trainer and football coach. Plays football twice a week and hits the gym daily. Enjoys sports analytics and follows Swiss football closely.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 40 },
  'Noah@algomate.local': { displayName: 'Noah', age: 33, location: 'St. Gallen', latitude: 47.4245, longitude: 9.3767, bio: 'Video game developer and hardcore gamer. Loves RPGs, strategy games, and immersive story-driven experiences. Looking for friends who share passion for gaming.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 120 },
  'Helena@algomate.local': { displayName: 'Helena', age: 27, location: 'Lugano', latitude: 46.0037, longitude: 8.9511, bio: 'Psychologist and avid reader who leads a monthly book club. Loves yoga and walking in nature to decompress from work intensity.', gender: 'female', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 60 },
  'Felix@algomate.local': { displayName: 'Felix', age: 38, location: 'Chur', latitude: 46.9176, longitude: 9.5374, bio: 'Architect with a passion for woodworking and DIY projects. Spends weekends in workshop building furniture and restoring old houses. Values craftsmanship.', gender: 'male', genderFilter: 'all', ageFilter: 'all', friendMinAge: 18, friendMaxAge: 99, distanceFilter: 'all', maxDistance: 100 },
};

async function ensureTestUsersExist() {
  for (const user of QUICK_USERS) {
    if (user.email === 'admin@algomate.local') continue;
    const existing = await getUserByEmail(user.email);
    if (!existing) {
      try {
        const created = await createUser(user.email, '123456');
        const profile = TEST_USER_PROFILES[user.email];
        if (profile) {
          await updateProfile(created.id, profile);
        }
      } catch (e) {
        console.error('Failed to create test user', user.name, e);
      }
    }
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    ensureTestUsersExist().finally(() => setInitializing(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await getUserByEmail(email);
      if (!user) { setError('No account found with this email'); setLoading(false); return; }
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) { setError('Incorrect password'); setLoading(false); return; }
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleQuickLogin(userEmail: string) {
    setError('');
    setLoading(true);
    try {
      const user = await getUserByEmail(userEmail);
      if (!user) { setError('User not found'); setLoading(false); return; }
      const token = await signToken({ userId: user.id, role: user.role });
      document.cookie = `algomate_token=${token}; path=/; SameSite=Lax`;
      router.push('/profile');
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-white">
        <Nav />
        <div className="container-main max-w-md">
          <div className="card text-center">
            <p className="text-lg" style={{ color: '#666' }}>Setting up test users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main max-w-md">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-6">Welcome Back</h1>
          {error && <p className="error bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="mb-6">
            <p className="text-sm font-medium mb-3" style={{ color: '#666' }}>Quick Login (Test Users)</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="btn-secondary text-sm py-2"
                  onClick={() => handleQuickLogin(u.email)}
                  disabled={loading}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: '#e5e7eb' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white" style={{ color: '#666' }}>Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-secondary w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p className="text-center mt-4" style={{ color: '#666' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline" style={{ color: '#849fcf' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}