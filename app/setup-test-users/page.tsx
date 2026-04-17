'use client';
import { useEffect } from 'react';
import Nav from '@/components/Nav';
import { createUser, getUserByEmail, getProfile, updateProfile, createMutualMatch, sendMessage } from '@/lib/db';
import { Profile } from '@/lib/types';

const TEST_USERS: Array<{
  name: string;
  email: string;
  displayName: string;
  age: number;
  location: string;
  latitude: number;
  longitude: number;
  bio: string;
  friendSex: Profile['friendSex'];
  friendMinAge: number;
  friendMaxAge: number;
  maxDistance: number;
}> = [
  { name: 'Marcus', email: 'Marcus@algomate.local', displayName: 'Marcus', age: 28, location: 'Zurich', latitude: 47.3769, longitude: 8.5417, bio: 'Software architect who loves hiking through the Swiss Alps and reading philosophy. Particularly drawn to Stoicism and modern existentialism. Values honesty, intellectual curiosity, and meaningful conversations.', friendSex: 'Male', friendMinAge: 25, friendMaxAge: 50, maxDistance: 100 },
  { name: 'Leonie', email: 'Leonie@algomate.local', displayName: 'Leonie', age: 24, location: 'Geneva', latitude: 46.2044, longitude: 6.1432, bio: 'Musician and music producer in Geneva creative scene. Plays guitar and keyboard, working on electronic music projects. Enjoys exploring hidden city spots and photography.', friendSex: 'Female', friendMinAge: 22, friendMaxAge: 35, maxDistance: 80 },
  { name: 'Sophia', email: 'Sophia@algomate.local', displayName: 'Sophia', age: 31, location: 'Bern', latitude: 46.9480, longitude: 7.4474, bio: 'Wildlife photographer who travels to remote locations. Loves extreme sports - paragliding, white-water rafting, rock climbing. Looking for adventurous friends.', friendSex: 'Female', friendMinAge: 28, friendMaxAge: 45, maxDistance: 200 },
  { name: 'Julian', email: 'Julian@algomate.local', displayName: 'Julian', age: 35, location: 'Basel', latitude: 47.5596, longitude: 7.5886, bio: 'Librarian and historian with a passion for board games. Hosts game nights playing everything from ancient strategy games to modern euros. Writes historical fiction in spare time.', friendSex: 'Male', friendMinAge: 30, friendMaxAge: 55, maxDistance: 60 },
  { name: 'Emilia', email: 'Emilia@algomate.local', displayName: 'Emilia', age: 29, location: 'Lausanne', latitude: 46.5197, longitude: 6.6323, bio: 'Frontend developer at a Lausanne tech startup. By night works on indie game projects. Passionate about technology, gaming culture, and building things that matter.', friendSex: 'Female', friendMinAge: 25, friendMaxAge: 40, maxDistance: 50 },
  { name: 'Theodor', email: 'Theodor@algomate.local', displayName: 'Theodor', age: 42, location: 'Lucerne', latitude: 47.0502, longitude: 8.3093, bio: 'Chef and food critic who runs a small restaurant. Cooking is life. Also loves classical music, opera, and theater. Looking for friends who appreciate good food and cultural outings.', friendSex: 'Male', friendMinAge: 35, friendMaxAge: 60, maxDistance: 80 },
  { name: 'Lukas', email: 'Lukas@algomate.local', displayName: 'Lukas', age: 26, location: 'Winterthur', latitude: 47.4979, longitude: 8.7243, bio: 'Fitness trainer and football coach. Plays football twice a week and hits the gym daily. Enjoys sports analytics and follows Swiss football closely.', friendSex: 'Male', friendMinAge: 22, friendMaxAge: 40, maxDistance: 40 },
  { name: 'Noah', email: 'Noah@algomate.local', displayName: 'Noah', age: 33, location: 'St. Gallen', latitude: 47.4245, longitude: 9.3767, bio: 'Video game developer and hardcore gamer. Loves RPGs, strategy games, and immersive story-driven experiences. Looking for friends who share passion for gaming.', friendSex: 'Male', friendMinAge: 28, friendMaxAge: 45, maxDistance: 120 },
  { name: 'Helena', email: 'Helena@algomate.local', displayName: 'Helena', age: 27, location: 'Lugano', latitude: 46.0037, longitude: 8.9511, bio: 'Psychologist and avid reader who leads a monthly book club. Loves yoga and walking in nature to decompress from work intensity.', friendSex: 'Female', friendMinAge: 24, friendMaxAge: 38, maxDistance: 60 },
  { name: 'Felix', email: 'Felix@algomate.local', displayName: 'Felix', age: 38, location: 'Chur', latitude: 46.9176, longitude: 9.5374, bio: 'Architect with a passion for woodworking and DIY projects. Spends weekends in workshop building furniture and restoring old houses. Values craftsmanship.', friendSex: 'Male', friendMinAge: 32, friendMaxAge: 55, maxDistance: 100 },
];

interface MessageData { from: string; messages: string[] }

const MATCH_CONVERSATIONS: Record<string, MessageData> = {
  'Marcus-Leonie': {
    from: 'Marcus',
    messages: [
      "Hey Leonie! I saw you're into electronic music. I've been getting into ambient techno lately.",
      "Oh nice! What artists are you listening to? I'm a big fan of Jon Hopkins and Bonobo.",
      "Same vibes! Have you been to the Zurich electronic scene much?",
      "A bit, yeah. Geneva has some cool underground venues too. We should exchange playlists!",
    ],
  },
  'Marcus-Julian': {
    from: 'Marcus',
    messages: [
      "Julian! Your bio mentioned Stoicism - have you read the newer books on that topic?",
      "Yes! I loved 'The Manual' translation by Gregory Hays. You?",
      "Reading it now. The perspective on death is particularly striking.",
      "Absolutely. Marcus Aurelius wrote about memento mori constantly. It's transformative.",
    ],
  },
  'Marcus-Noah': {
    from: 'Marcus',
    messages: [
      "Hey Noah! Game developer here too. What engines do you work with?",
      "Mostly Unity and Godot for my indie stuff. You?",
      "Full-stack web dev by day, but I've been tinkering with Bevy (Rust) for fun.",
      "Nice! Rust is on my learning list. The performance benefits must be great for your games.",
    ],
  },
  'Leonie-Sophia': {
    from: 'Leonie',
    messages: [
      "Sophia! Wildlife photography sounds amazing. Any favorite shots you've taken in Switzerland?",
      "The alpine ibex in the Bernese Oberland was incredible. Also chamois in Graubunden.",
      "Those must be breathtaking! Do you do any night photography?",
      "When conditions allow. The Milky Way over the Alps is unreal.",
    ],
  },
  'Leonie-Helena': {
    from: 'Leonie',
    messages: [
      "Helena! A psychologist who reads - that combination sounds fascinating.",
      "Haha yes, I analyze fictional characters for fun. What about you?",
      "I decompress through music production. Curiously similar dopamine hit.",
    ],
  },
  'Sophia-Theodor': {
    from: 'Sophia',
    messages: [
      "Theodor! Chef and food critic - I bet you've seen the best of Swiss cuisine.",
      "Indeed! But my heart is in traditional Swiss-Italian fusion. Ticino inspiration.",
      "Oh like pergola and Risotto? I've had amazing risotto in Ascona.",
      "Yes! Have you been to my restaurant? I'd love to have you as a guest.",
    ],
  },
  'Sophia-Felix': {
    from: 'Sophia',
    messages: [
      "Felix! Architect and woodworker - that's a beautiful combination.",
      "Thanks! Building things runs in the family. My grandfather was a cabinet maker.",
      "There's something special about handcrafted furniture. Any signature pieces?",
      "A walnut dining table with Japanese joinery. No nails, just wood pegs.",
    ],
  },
  'Julian-Emilia': {
    from: 'Julian',
    messages: [
      "Emilia! Indie game dev here. What's your current project?",
      "A narrative puzzle game about memory and loss. It's deeply personal.",
      "That sounds emotionally powerful. What engine are you using?",
      "Godot. The open source nature aligns with the themes.",
    ],
  },
  'Julian-Lukas': {
    from: 'Julian',
    messages: [
      "Lukas! I host board game nights - euros and abstracts. Any favorites?",
      "I love strategy games! Terraforming Mars is a go-to. You?",
      "Through the Ages for heavy strategy, or Azul for lighter sessions.",
      "Excellent taste! We should organize a game night virtual session.",
    ],
  },
  'Emilia-Noah': {
    from: 'Emilia',
    messages: [
      "Noah! Fellow game dev in Switzerland! What's your take on the indie scene here?",
      "Growing nicely. Zurich and Basel have good meetups. Lausanne too.",
      "Have you been to the Game Dev Switzerland meetups?",
      "A few times. Great networking. We should grab coffee and trade dev stories.",
    ],
  },
  'Theodor-Helena': {
    from: 'Theodor',
    messages: [
      "Helena! Book club leader. I'm always looking for new reading recommendations.",
      "Have you explored food writing? 'Kitchen Confidential' is a classic.",
      "Of course! And 'The Art of Eating' by M.F.K. Fisher is phenomenal.",
      "We should start a food-and-books crossover club!",
    ],
  },
  'Lukas-Felix': {
    from: 'Lukas',
    messages: [
      "Felix! Woodworking and architecture - have you worked with sports facility design?",
      "A bit. I consulted on a gym renovation once. Why do you ask?",
      "I train clients with custom home gym setups. Quality craftsmanship matters.",
      "Absolutely. I can recommend sustainable hardwood sources if you ever need.",
    ],
  },
  'Noah-Helena': {
    from: 'Noah',
    messages: [
      "Helena! Your book club - any interest in exploring sci-fi and philosophy?",
      "Absolutely! I've been meaning to re-read 'Dune' with fresh psychological lenses.",
      "Frank Herbert's exploration of religion and ecology is endlessly deep.",
      "Let's plan a session! 'Blindsight' by Peter Watts would be fascinating too.",
    ],
  },
  'Helena-Felix': {
    from: 'Helena',
    messages: [
      "Felix! Mindfulness and craftsmanship - I imagine you understand the meditative aspect.",
      "Exactly! When I'm in the workshop, time just dissolves. It's therapeutic.",
      "I find the same with yoga and gardening. Flow states are magical.",
      "We should exchange notes on creating those conditions intentionally.",
    ],
  },
};

export default function SetupTestUsers() {
  useEffect(() => {
    async function setup() {
      const userIds: Record<string, string> = {};

      for (const user of TEST_USERS) {
        try {
          const existing = await getUserByEmail(user.email);
          if (existing) {
            userIds[user.name] = existing.id;
            continue;
          }
          await createUser(user.email, '123456');
          const created = await getUserByEmail(user.email);
          if (created) {
            userIds[user.name] = created.id;
            await updateProfile(created.id, {
              displayName: user.displayName,
              bio: user.bio,
              location: user.location,
              latitude: user.latitude,
              longitude: user.longitude,
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

      const pairs: [string, string][] = [
        ['Marcus', 'Leonie'],
        ['Marcus', 'Julian'],
        ['Marcus', 'Noah'],
        ['Leonie', 'Sophia'],
        ['Leonie', 'Helena'],
        ['Sophia', 'Theodor'],
        ['Sophia', 'Felix'],
        ['Julian', 'Emilia'],
        ['Julian', 'Lukas'],
        ['Emilia', 'Noah'],
        ['Theodor', 'Helena'],
        ['Lukas', 'Felix'],
        ['Noah', 'Helena'],
        ['Helena', 'Felix'],
      ];

      for (const [a, b] of pairs) {
        const idA = userIds[a];
        const idB = userIds[b];
        if (!idA || !idB) continue;

        try {
          const convKey = MATCH_CONVERSATIONS[`${a}-${b}`] ? `${a}-${b}` : `${b}-${a}`;
          const conv = MATCH_CONVERSATIONS[convKey];
          if (!conv) continue;

          const match = await createMutualMatch(idA, idB, 7.5);

          const senderA = conv.from === a ? idA : idB;
          const senderB = conv.from === a ? idB : idA;

          const now = match.createdAt;
          for (let i = 0; i < conv.messages.length; i++) {
            const senderId = i % 2 === 0 ? senderA : senderB;
            await sendMessage(match.id, senderId, conv.messages[i], now + i * 3600000);
          }
        } catch (e) {
          console.error('Failed to create match', a, b, e);
        }
      }

      alert('10 test users with matches and messages created!');
    }
    setup();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="container-main">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-4">Creating Test Users...</h1>
          <p>Setting up 10 test profiles with matches and chat messages. Please wait.</p>
        </div>
      </div>
    </div>
  );
}