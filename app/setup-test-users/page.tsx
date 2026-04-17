'use client';
import { useEffect } from 'react';
import Nav from '@/components/Nav';
import { createUser, getUserByEmail, getProfile, updateProfile } from '@/lib/db';
import { Profile } from '@/lib/types';

const TEST_USERS: Array<{
  name: string;
  email: string;
  displayName: string;
  age: number;
  location: string;
  bio: string;
  friendSex: Profile['friendSex'];
  friendMinAge: number;
  friendMaxAge: number;
  maxDistance: number;
}> = [
  { name: 'Marcus', email: 'Marcus@algomate.local', displayName: 'Marcus', age: 28, location: 'Munich', bio: 'Software architect who loves hiking through the Bavarian Alps and reading philosophy. Particularly drawn to Stoicism and modern existentialism. Values honesty, intellectual curiosity, and meaningful conversations.', friendSex: 'Male', friendMinAge: 25, friendMaxAge: 50, maxDistance: 200 },
  { name: 'Leonie', email: 'Leonie@algomate.local', displayName: 'Leonie', age: 24, location: 'Hamburg', bio: 'Musician and music producer in Hamburg creative scene. Plays guitar and keyboard, working on electronic music projects. Enjoys exploring hidden city spots and photography.', friendSex: 'Female', friendMinAge: 22, friendMaxAge: 35, maxDistance: 100 },
  { name: 'Sophia', email: 'Sophia@algomate.local', displayName: 'Sophia', age: 31, location: 'Zurich', bio: 'Wildlife photographer who travels to remote locations. Loves extreme sports - paragliding, white-water rafting, rock climbing. Looking for adventurous friends.', friendSex: 'Female', friendMinAge: 28, friendMaxAge: 45, maxDistance: 500 },
  { name: 'Julian', email: 'Julian@algomate.local', displayName: 'Julian', age: 35, location: 'Vienna', bio: 'Librarian and historian with a passion for board games. Hosts game nights playing everything from ancient strategy games to modern euros. Writes historical fiction in spare time.', friendSex: 'Male', friendMinAge: 30, friendMaxAge: 55, maxDistance: 150 },
  { name: 'Emilia', email: 'Emilia@algomate.local', displayName: 'Emilia', age: 29, location: 'Berlin', bio: 'Frontend developer at a Berlin startup. By night works on indie game projects. Passionate about technology, gaming culture, and building things that matter.', friendSex: 'Female', friendMinAge: 25, friendMaxAge: 40, maxDistance: 50 },
  { name: 'Theodor', email: 'Theodor@algomate.local', displayName: 'Theodor', age: 42, location: 'Cologne', bio: 'Chef and food critic who runs a small restaurant. Cooking is life. Also loves classical music, opera, and theater. Looking for friends who appreciate good food and cultural outings.', friendSex: 'Male', friendMinAge: 35, friendMaxAge: 60, maxDistance: 100 },
  { name: 'Lukas', email: 'Lukas@algomate.local', displayName: 'Lukas', age: 26, location: 'Stuttgart', bio: 'Fitness trainer and football coach. Plays football twice a week and hits the gym daily. Enjoys sports analytics and follows the Bundesliga closely.', friendSex: 'Male', friendMinAge: 22, friendMaxAge: 40, maxDistance: 100 },
  { name: 'Noah', email: 'Noah@algomate.local', displayName: 'Noah', age: 33, location: 'Leipzig', bio: 'Video game developer and hardcore gamer. Loves RPGs, strategy games, and immersive story-driven experiences. Looking for friends who share passion for gaming.', friendSex: 'Male', friendMinAge: 28, friendMaxAge: 45, maxDistance: 200 },
  { name: 'Helena', email: 'Helena@algomate.local', displayName: 'Helena', age: 27, location: 'Frankfurt', bio: 'Psychologist and avid reader who leads a monthly book club. Loves yoga and walking in nature to decompress from work intensity.', friendSex: 'Female', friendMinAge: 24, friendMaxAge: 38, maxDistance: 100 },
  { name: 'Felix', email: 'Felix@algomate.local', displayName: 'Felix', age: 38, location: 'Dresden', bio: 'Architect with a passion for woodworking and DIY projects. Spends weekends in workshop building furniture and restoring old houses. Values craftsmanship.', friendSex: 'Male', friendMinAge: 32, friendMaxAge: 55, maxDistance: 150 },
];

export default function SetupTestUsers() {
  useEffect(() => {
    async function setup() {
      for (const user of TEST_USERS) {
        try {
          const existing = await getUserByEmail(user.email);
          if (existing) continue;
          await createUser(user.email, '123456');
          const created = await getUserByEmail(user.email);
          if (created) {
            await updateProfile(created.id, {
              displayName: user.displayName,
              bio: user.bio,
              location: user.location,
              age: user.age,
              friendSex: user.friendSex,
              friendMinAge: user.friendMinAge,
              friendMaxAge: user.friendMaxAge,
              maxDistance: user.maxDistance,
            });
          }
        } catch (e) {
          console.error('Failed to create', user.name, e);
        }
      }
      alert('10 test users created!');
    }
    setup();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-4">Creating Test Users...</h1>
          <p>Setting up 10 test profiles. Please wait.</p>
        </div>
      </div>
    </div>
  );
}