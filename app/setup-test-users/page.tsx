'use client';
import { useEffect } from 'react';
import Nav from '@/components/Nav';
import { createUser, getUserByEmail, getProfile, updateProfile } from '@/lib/db';

const TEST_USERS = [
  { name: 'Marcus', email: 'Marcus@algomate.local', bio: 'Name: Marcus\nAge: 28\nLocation: Munich\nLooking for: Friends for outdoor activities and philosophical debates\n\nI work as a software architect and spend most of my days coding. When I\'m not working, I love hiking through the Bavarian Alps and reading philosophy. I\'m particularly drawn to Stoicism and modern existentialism. My favorite books are by Marcus Aurelius, Nietzsche, and contemporary sci-fi authors like China Miéville. I value honesty, intellectual curiosity, and meaningful conversations. Looking for friends who enjoy long hikes, deep discussions about consciousness and reality, and who aren\'t afraid to question their assumptions.\n\nInterests: hiking, philosophy, sci-fi, architecture, technology, meditation\nHobbies: mountaineering, chess, writing, photography, cooking\nValues: honesty, curiosity, integrity, growth, authenticity' },
  { name: 'Leonie', email: 'Leonie@algomate.local', bio: 'Name: Leonie\nAge: 24\nLocation: Hamburg\nLooking for: Creative friends for music projects and urban exploration\n\nI\'m a musician and music producer living in Hamburg\'s creative scene. I play guitar and keyboard, and I\'m currently working on electronic music projects. When I\'m not making music, I enjoy exploring the city\'s hidden spots, photography, and visiting art galleries. I value creativity, authenticity, and open-mindedness. Looking for friends who share my passion for music, enjoy artistic pursuits, and like to discover new places in the city.\n\nInterests: music production, electronic music, photography, art, urban exploration, concerts\nHobbies: playing guitar, keyboard, music production, graffiti art, skateboarding, vintage shopping\nValues: creativity, authenticity, freedom, self-expression, community' },
  { name: 'Sophia', email: 'Sophia@algomate.local', bio: 'Name: Sophia\nAge: 31\nLocation: Zurich\nLooking for: Adventure partners for travel and extreme sports\n\nAs a wildlife photographer, I spend half the year traveling to remote locations. I\'ve been to Antarctica, the Amazon, and the Mongolian steppes. The other half I spend in Zurich, working on my photo book and editing footage. I love extreme sports — paragliding, white-water rafting, rock climbing. I\'m looking for friends who share my adventurous spirit, don\'t mind uncomfortable journeys, and appreciate the beauty of untouched nature.\n\nInterests: photography, travel, wildlife, extreme sports, conservation, documentary films\nHobbies: paragliding, rock climbing, diving, wildlife observation, hiking, camping\nValues: adventure, conservation, courage, exploration, resilience' },
  { name: 'Julian', email: 'Julian@algomate.local', bio: 'Name: Julian\nAge: 35\nLocation: Vienna\nLooking for: Friends for board game nights and intellectual discussions\n\nI\'m a librarian and historian with a passion for board games. Every other week I host a game night at my apartment where we play everything from ancient strategy games like Go to modern euros. I also write historical fiction in my spare time. I\'m looking for friends who enjoy strategic thinking, appreciate both competitive and cooperative games, and like discussing history, culture, and society.\n\nInterests: board games, history, historical fiction, chess, puzzles, literature, archaeology\nHobbies: game design, writing, research, cooking, wine tasting, museum visits\nValues: knowledge, patience, strategy, community, tradition, wisdom' },
  { name: 'Emilia', email: 'Emilia@algomate.local', bio: 'Name: Emilia\nAge: 29\nLocation: Berlin\nLooking for: Friends for coding projects and startup adventures\n\nI\'m a frontend developer at a Berlin startup. By day I build web apps, by night I work on my own indie game project. I\'m passionate about technology, gaming culture, and building things that matter. Looking for friends who are into coding, game development, startups, and who enjoy the Berlin tech scene.\n\nInterests: web development, gaming, indie games, startups, technology, UI/UX design\nHobbies: game development, coding, gaming, cooking, running, podcast listening\nValues: innovation, ambition, creativity, perseverance, community' },
  { name: 'Theodor', email: 'Theodor@algomate.local', bio: 'Name: Theodor\nAge: 42\nLocation: Cologne\nLooking for: Friends for cooking sessions and cultural events\n\nI\'m a chef and food critic who runs a small restaurant in Cologne. Cooking is my life — not just professionally, but as a way to connect with people. I also love classical music, opera, and theater. Looking for friends who appreciate good food, enjoy cultural outings, and like to host dinner parties.\n\nInterests: cooking, fine dining, classical music, opera, theater, wine, gardening\nHobbies: cooking, food criticism, gardening, playing violin, art history, traveling\nValues: quality, tradition, hospitality, community, craftsmanship, generosity' },
  { name: 'Lukas', email: 'Lukas@algomate.local', bio: 'Name: Lukas\nAge: 26\nLocation: Stuttgart\nLooking for: Sports buddies for football and fitness activities\n\nI\'m a fitness trainer and football coach. Sports are my life — I play football twice a week and hit the gym daily. I also enjoy sports analytics and follow the Bundesliga closely. Looking for friends who are into sports, fitness, healthy living, and who enjoy both playing and watching sports.\n\nInterests: football, fitness, nutrition, sports analytics, running, cycling\nHobbies: football, weightlifting, cycling, hiking, sports video games, cooking\nValues: discipline, teamwork, health, perseverance, fairness, commitment' },
  { name: 'Noah', email: 'Noah@algomate.local', bio: 'Name: Noah\nAge: 33\nLocation: Leipzig\nLooking for: Friends for gaming sessions and sci-fi discussions\n\nI\'m a video game developer and hardcore gamer. I\'ve been playing games since I was 5 and now I make them for a living. I love RPGs, strategy games, and immersive story-driven experiences. Looking for friends who share my passion for gaming, enjoy discussing game design, and appreciate great storytelling.\n\nInterests: video games, RPGs, game design, sci-fi, fantasy, technology, streaming\nHobbies: gaming, game development, writing, watching anime, cosplay, board games\nValues: creativity, innovation, storytelling, community, fun, authenticity' },
  { name: 'Helena', email: 'Helena@algomate.local', bio: 'Name: Helena\nAge: 27\nLocation: Frankfurt\nLooking for: Friends for book club and nature walks\n\nI\'m a psychologist and avid reader. I lead a book club that meets monthly to discuss everything from classic literature to contemporary fiction. I also love yoga and walking in nature — it helps me decompress from the intensity of my work. Looking for friends who enjoy reading, meaningful conversations, and mindful activities.\n\nInterests: psychology, literature, yoga, nature, philosophy, writing, meditation\nHobbies: reading, writing, yoga, hiking, gardening, pottery, volunteer work\nValues: empathy, mindfulness, growth, kindness, balance, authenticity' },
  { name: 'Felix', email: 'Felix@algomate.local', bio: 'Name: Felix\nAge: 38\nLocation: Dresden\nLooking for: Friends for DIY projects and woodworking\n\nI\'m an architect with a passion for woodworking and DIY projects. I spend my weekends in my workshop building furniture, restoring old houses, and tinkering with smart home systems. I value craftsmanship and building things that last. Looking for friends who enjoy hands-on projects, appreciate craftsmanship, and like solving practical problems together.\n\nInterests: architecture, woodworking, DIY, renovation, smart home, sustainability, gardening\nHobbies: woodworking, home renovation, gardening, carpentry, electronics, hiking\nValues: craftsmanship, sustainability, patience, quality, independence, resourcefulness' }
];

function parseBio(bio: string) {
  const lower = bio.toLowerCase();
  const lines = bio.split('\n');

  let displayName = '';
  let bioText = bio;
  let location = '';
  let age = 0;
  let lookingFor = '';
  const interests: string[] = [];
  const values: string[] = [];
  const hobbies: string[] = [];

  const interestKeywords = ['hiking', 'reading', 'gaming', 'cooking', 'sports', 'music', 'movies', 'travel', 'photography', 'art', 'painting', 'writing', 'dancing', 'yoga', 'running', 'cycling', 'swimming', 'skiing', 'surfing', 'climbing', 'fishing', 'gardening', 'chess', 'puzzles', 'coding', 'crafts', 'sewing', 'knitting', 'pottery', 'woodworking', 'electronics', 'robotics', 'sci-fi', 'fantasy', 'anime', 'manga', 'cosplay', 'streaming', 'gaming', 'game development', 'food', 'wine', 'cooking', 'fitness', 'football', 'nutrition', 'meditation', 'philosophy', 'psychology', 'literature', 'theater', 'opera', 'music production', 'electronic music', 'graffiti', 'skateboarding', 'vintage shopping', 'wildlife', 'conservation', 'extreme sports', 'diving', 'mountaineering', 'archaeology', 'smart home', 'renovation', 'sustainability'];
  const valueKeywords = ['honesty', 'loyalty', 'respect', 'kindness', 'courage', 'patience', 'humor', 'ambition', 'creativity', 'curiosity', 'independence', 'community', 'adventure', 'growth', 'wisdom', 'health', 'fitness', 'authenticity', 'integrity', 'quality', 'craftsmanship', 'sustainability', 'innovation', 'discipline', 'teamwork', 'empathy', 'mindfulness', 'freedom', 'self-expression', 'resilience', 'perseverance', 'commitment', 'fairness', 'generosity', 'hospitality', 'tradition', 'knowledge', 'strategy', 'creativity'];
  const hobbyKeywords = ['hiking', 'reading', 'gaming', 'cooking', 'sports', 'music', 'movies', 'travel', 'photography', 'art', 'writing', 'yoga', 'running', 'cycling', 'chess', 'gardening', 'woodworking', 'electronics', 'crafts', 'skiing', 'surfing', 'climbing', 'cooking', 'game development', 'anime', 'cosplay', 'pottery', 'sewing', 'knitting', 'playing violin', 'football', 'weightlifting', 'hiking', 'museum visits', 'wine tasting', 'fitness training', 'podcast listening'];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('name:')) displayName = line.split(':')[1].trim();
    if (lowerLine.startsWith('age:')) age = parseInt(line.match(/\d+/)?.[0] || '0');
    if (lowerLine.startsWith('location:')) location = line.split(':')[1].trim();
    if (lowerLine.startsWith('looking for:')) lookingFor = line.split(':')[1].trim();
  }

  interestKeywords.forEach(k => { if (lower.includes(k) && !interests.includes(k)) interests.push(k); });
  valueKeywords.forEach(k => { if (lower.includes(k) && !values.includes(k)) values.push(k); });
  hobbyKeywords.forEach(k => { if (lower.includes(k) && !hobbies.includes(k)) hobbies.push(k); });

  bioText = lines.filter(l => !l.toLowerCase().startsWith('name:') && !l.toLowerCase().startsWith('age:') && !l.toLowerCase().startsWith('location:') && !l.toLowerCase().startsWith('looking for:') && !l.toLowerCase().startsWith('interests:') && !l.toLowerCase().startsWith('hobbies:') && !l.toLowerCase().startsWith('values:')).join('\n').trim();

  return { displayName, bio: bioText, location, age, lookingFor, interests, values, hobbies };
}

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
            const parsed = parseBio(user.bio);
            await updateProfile(created.id, {
              displayName: parsed.displayName,
              bio: parsed.bio,
              location: parsed.location,
              age: parsed.age,
              lookingFor: parsed.lookingFor,
              interests: parsed.interests,
              values: parsed.values,
              hobbies: parsed.hobbies,
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