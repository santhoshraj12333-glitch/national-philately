require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Country = require('./models/Country');
const Series = require('./models/Series');
const Stamp = require('./models/Stamp');
const Collection = require('./models/Collection');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Notification = require('./models/Notification');
const Achievement = require('./models/Achievement');
const Follow = require('./models/Follow');
const UserAchievement = require('./models/UserAchievement');

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Country.deleteMany({}),
    Series.deleteMany({}),
    Stamp.deleteMany({}),
    Collection.deleteMany({}),
    Post.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    Achievement.deleteMany({}),
    Follow.deleteMany({}),
    UserAchievement.deleteMany({}),
  ]);

  /* ---------------- Countries ---------------- */
  const countryDocs = await Country.insertMany([
    { name: 'India', iso2: 'IN', iso3: 'IND', flag: '🇮🇳', region: 'South Asia', currency: 'Indian Rupee', firstIssueYear: 1852, description: 'India Post issues stamps from 1852, making it one of the oldest philatelic traditions in the world.' },
    { name: 'Japan', iso2: 'JP', iso3: 'JPN', flag: '🇯🇵', region: 'East Asia', currency: 'Japanese Yen', firstIssueYear: 1871, description: 'Japan Post (JP Post) is renowned for its precision printing and artistic stamp designs.' },
    { name: 'United Kingdom', iso2: 'GB', iso3: 'GBR', flag: '🇬🇧', region: 'Europe', currency: 'Pound Sterling', firstIssueYear: 1840, description: 'The Penny Black of 1840 is the world’s first adhesive postage stamp.' },
    { name: 'United States', iso2: 'US', iso3: 'USA', flag: '🇺🇸', region: 'North America', currency: 'US Dollar', firstIssueYear: 1847, description: 'The United States Postal Service issued its first stamps in 1847.' },
    { name: 'France', iso2: 'FR', iso3: 'FRA', flag: '🇫🇷', region: 'Europe', currency: 'Euro', firstIssueYear: 1849, description: 'La Poste issued the first French postage stamps, the Cérès design, in 1849.' },
    { name: 'Germany', iso2: 'DE', iso3: 'DEU', flag: '🇩🇪', region: 'Europe', currency: 'Euro', firstIssueYear: 1847, description: 'The German Empire’s first stamps, the Black Ones, appeared in 1847.' },
    { name: 'Egypt', iso2: 'EG', iso3: 'EGY', flag: '🇪🇬', region: 'Africa', currency: 'Egyptian Pound', firstIssueYear: 1866, description: 'Egypt has issued stamps since 1866, with a rich Ottoman and modern series tradition.' },
    { name: 'Brazil', iso2: 'BR', iso3: 'BRA', flag: '🇧🇷', region: 'South America', currency: 'Brazilian Real', firstIssueYear: 1843, description: 'The Bulls’ Eyes of 1843 are among the most valuable early Brazilian stamps.' },
    { name: 'Australia', iso2: 'AU', iso3: 'AUS', flag: '🇦🇺', region: 'Oceania', currency: 'Australian Dollar', firstIssueYear: 1913, description: 'Australia Post issued its first stamps in 1913, including the famous Map stamp.' },
    { name: 'China', iso2: 'CN', iso3: 'CHN', flag: '🇨🇳', region: 'East Asia', currency: 'Chinese Yuan', firstIssueYear: 1878, description: 'China issued its first postage stamps, the Qing customs stamps, in 1878.' },
    { name: 'Kenya', iso2: 'KE', iso3: 'KEN', flag: '🇰🇪', region: 'Africa', currency: 'Kenyan Shilling', firstIssueYear: 1917, description: 'Kenya Post is widely known for its large, wildlife-themed definitive series.' },
    { name: 'Italy', iso2: 'IT', iso3: 'ITA', flag: '🇮🇹', region: 'Europe', currency: 'Euro', firstIssueYear: 1862, description: 'Italy’s first stamps were issued in 1862 in the Kingdom of Sardinia.' },
  ]);
  const country = (iso2) => countryDocs.find((c) => c.iso2 === iso2);

  /* ---------------- Achievements ---------------- */
  const ach = await Achievement.insertMany([
    { name: 'First Stamp', description: 'Added your first stamp to your collection', icon: '📮' },
    { name: 'First Post', description: 'Shared your first post with the community', icon: '✍️' },
    { name: '10 Stamps', description: 'Collected 10 stamps', icon: '⭐' },
    { name: '50 Stamps', description: 'Collected 50 stamps', icon: '💎' },
    { name: '100 Stamps', description: 'Collected 100 stamps', icon: '🏆' },
    { name: 'Community Contributor', description: 'Published 3 or more posts', icon: '🤝' },
    { name: 'History Explorer', description: 'Collected a stamp from the History theme', icon: '🏛️' },
    { name: 'Wildlife Collector', description: 'Collected 3 or more Wildlife stamps', icon: '🐅' },
    { name: 'International Collector', description: 'Collected stamps from 5 or more countries', icon: '🌍' },
    { name: 'First Series', description: 'Completed a full stamp series', icon: '🧩' },
  ]);

  /* ---------------- Users ---------------- */
  const salt = await bcrypt.genSalt(10);
  const hash = (pw) => bcrypt.hashSync(pw, salt);

  const admin = await User.create({
    name: 'National Philately Admin',
    username: 'admin',
    email: 'admin@philately.com',
    password: hash('admin123'),
    role: 'admin',
    bio: 'Official account of National Philately.',
  });

  const [arjun, priya, rahul, sneha, vikram] = await User.create([
    { name: 'Arjun Mehta', username: 'arjun', email: 'user@philately.com', password: hash('user123'), bio: 'Indian Philately Enthusiast · History & Heritage', interests: ['Historical', 'Personalities'] },
    { name: 'Priya Sharma', username: 'priya', email: 'priya@philately.com', password: hash('user123'), bio: 'Wildlife stamp collector · Nature lover', interests: ['Wildlife', 'Culture'] },
    { name: 'Rahul Verma', username: 'rahul', email: 'rahul@philately.com', password: hash('user123'), bio: 'Space & science philately', interests: ['Space', 'Science'] },
    { name: 'Sneha Patel', username: 'sneha', email: 'sneha@philately.com', password: hash('user123'), bio: 'Culture, temples and world stamps', interests: ['Culture', 'Architecture'] },
    { name: 'Vikram Singh', username: 'vikram', email: 'vikram@philately.com', password: hash('user123'), bio: 'Sports philately fan · Cricket collector', interests: ['Sports'] },
  ]);

  /* ---------------- Series ---------------- */
  const seriesDocs = await Series.insertMany([
    { name: "India's Independence & Freedom Struggle", country: country('IN')._id, category: 'Historical', theme: 'Independence', issuedFrom: 1947, issuedTo: 1950, description: 'Issues marking independence, the Constitution and the freedom movement.' },
    { name: 'Indian Wildlife Definitive Series', country: country('IN')._id, category: 'Wildlife', theme: 'Wildlife', issuedFrom: 1963, issuedTo: 1973, description: 'A definitive series showcasing India\'s national fauna.' },
    { name: "India's Space Programme", country: country('IN')._id, category: 'Science', theme: 'Space', issuedFrom: 1975, issuedTo: 1981, description: 'From Aryabhata to the Rohini launch - India\'s own milestones in orbit.' },
    { name: 'World Heritage Definitive Series', country: country('IN')._id, category: 'Definitive', theme: 'Architecture', issuedFrom: 2004, issuedTo: 2004, description: 'UNESCO World Heritage sites around the world.' },
    { name: 'Indian Sporting Legends', country: country('IN')._id, category: 'Sports', theme: 'Sports', issuedFrom: 1982, issuedTo: 2013, description: 'Commemorating India\'s greatest sporting achievements.' },
    { name: 'Kenya Wildlife Series', country: country('KE')._id, category: 'Wildlife', theme: 'Wildlife', issuedFrom: 1938, issuedTo: 1974, description: 'Wildlife issues from Kenya and the Kenya-Uganda-Tanganyika era.' },
    { name: 'Space Exploration', country: country('US')._id, category: 'Commemorative', theme: 'Space', issuedFrom: 1969, issuedTo: 1969, description: 'The first human voyages beyond Earth.' },
  ]);
  const S = (name) => seriesDocs.find((s) => s.name === name);

  /* ---------------- Stamps ---------------- */
  // category = philatelic class | theme = subject matter.
  // The catalogue is the curated output of scripts/fetch-stamps.js: real
  // Wikimedia Commons scans with their licences, in data/stamps.json.
  const stampData = require('./data/stamps.json');

  const stamps = await Stamp.insertMany(
    stampData.map((s) => ({
      name: s.name,
      category: s.category,
      theme: s.theme,
      country: country(s.country)._id,
      countryName: country(s.country).name,
      year: s.year,
      series: s.series ? S(s.series)._id : null,
      seriesNumber: s.seriesNumber ?? null,
      denomination: s.denomination || '',
      person: s.person || '',
      description: s.description,
      story: s.story,
      designNote: s.designNote || '',
      image: s.image || '',
      source: s.source || '',
      sourceUrl: s.sourceUrl || '',
      credit: s.credit || '',
      license: s.license || '',
      licenseUrl: s.licenseUrl || '',
      viewCount: 100,
    }))
  );

  // Every catalogue entry must have a real file behind its image url.
  const missingImages = stamps
    .filter((s) => !s.image || !fs.existsSync(path.join(__dirname, 'public', 'stamps', s.image.split('/').pop())))
    .map((s) => s.name);
  if (missingImages.length) throw new Error(`missing image files for: ${missingImages.join(', ')}`);

  // Give each series a real total so Collection Gaps can be computed later.
  for (const s of seriesDocs) {
    s.totalStamps = await Stamp.countDocuments({ series: s._id });
    await s.save();
  }
  // Vary popularity so "Popular" sorting is meaningful.
  const views = [980, 870, 810, 760, 690, 640, 600, 560, 520, 480, 440, 410, 380, 350, 320, 300, 280, 250, 220, 190];
  for (let i = 0; i < stamps.length; i++) {
    stamps[i].viewCount = views[i % views.length];
    await stamps[i].save();
  }

  const byName = (n) => stamps.find((s) => s.name === n);

  /* ---------------- Follow graph ---------------- */
  const all = [arjun, priya, rahul, sneha, vikram];
  const edges = [
    [arjun, priya], [arjun, rahul], [arjun, sneha],
    [priya, arjun], [priya, sneha],
    [rahul, arjun],
    [sneha, arjun], [sneha, vikram],
    [vikram, arjun], [vikram, rahul],
  ];
  await Follow.insertMany(
    edges.map(([follower, following]) => ({ follower: follower._id, following: following._id }))
  );

  /* ---------------- Collections ---------------- */
  const collectionItems = [];
  const addTo = (user, ...names) => {
    names.forEach((n) => {
      const s = byName(n);
      if (s) collectionItems.push({ user: user._id, stamp: s._id });
    });
  };

  // Arjun completes exactly one country (Australia) so the Passport page has a
  // finished page to show, plus a spread of Indian and world classics.
  addTo(arjun, 'Indian Independence', 'Constitution of India', 'Mahatma Gandhi', 'Taj Mahal', 'Bengal Tiger', 'Penny Black',
    'Kangaroo and Map', 'Sydney Harbour Bridge', 'Melbourne 1956 Olympics', 'Superb Lyrebird');
  addTo(priya, 'Bengal Tiger', 'Indian Elephant', 'Giant Panda', 'Royal Lion', 'Chambered Nautilus');
  addTo(rahul, 'Aryabhata Satellite', 'Rohini Satellite', 'Apollo 11 Moon Landing');
  addTo(sneha, 'Taj Mahal', 'Cherry Blossom', 'Great Sphinx of Giza', 'Mona Lisa', 'Rio Carnival');
  addTo(vikram, 'Asian Games Delhi', 'Sachin Tendulkar', 'FIFA World Cup 1970');
  await Collection.insertMany(collectionItems);

  /* ---------------- Posts ---------------- */
  const postData = [
    { user: arjun._id, content: 'Finally added the 1947 Independence issue to my collection. Standing in a small stamp shop in Kolkata, I felt the weight of history in my hands. 🇮🇳', stamp: 'Indian Independence' },
    { user: priya._id, content: 'The Bengal Tiger definitive is still my favourite. The intaglio on this issue is beautiful — you can almost feel the fur texture. Anyone got the elephant definitive yet?', stamp: 'Bengal Tiger' },
    { user: rahul._id, content: 'Just got the Rohini satellite stamp from the post office. The launch vehicle programme made every Indian proud. 🚀', stamp: 'Rohini Satellite' },
    { user: sneha._id, content: 'World Heritage definitives are so elegant. Anyone up for a swap this weekend?', stamp: 'Taj Mahal' },
    { user: vikram._id, content: 'Sachin finally on a stamp! A true legend honoured on postage. Still the GOAT. 🏏', stamp: 'Sachin Tendulkar' },
    { user: arjun._id, content: 'My collection just crossed 10 stamps today. It started with one torn stamp from my grandfather’s album — what began as nostalgia is now a genuine passion. 📚', stamp: null },
    { user: priya._id, content: 'Anyone else collect wildlife stamps from around the world? Looking to trade my Royal Lion for an Apollo 11.', stamp: 'Royal Lion' },
    { user: rahul._id, content: 'Every space stamp tells a story of human ambition. From Aryabhata to Apollo 11, and we are still going. 🌌', stamp: 'Apollo 11 Moon Landing' },
    { user: sneha._id, content: 'Cherry blossoms in Japan are about impermanence — a good reminder for collectors too. This issue renders them beautifully. 🌸', stamp: 'Cherry Blossom' },
    { user: vikram._id, content: 'Football at the 1982 Asian Games in Delhi — India stamping its own tournament is one of my favourites. Great community here — keep the posts coming!', stamp: 'Asian Games Delhi' },
  ];

  const posts = await Post.insertMany(
    postData.map((p) => ({
      user: p.user,
      content: p.content,
      image: '',
      stamp: p.stamp ? byName(p.stamp)._id : null,
      likes: [],
    }))
  );

  /* ---------------- Likes ---------------- */
  const likeMap = [
    [1, 0, 2], [0, 2, 3], [1, 3, 4], [0, 1, 2], [0, 3, 4],
    [1, 2], [2], [1, 3], [0, 1], [0, 2],
  ];
  posts.forEach((post, i) => {
    post.likes = (likeMap[i] || []).map((idx) => all[idx]._id);
  });
  await Promise.all(posts.map((p) => p.save()));

  /* ---------------- Comments ---------------- */
  await Comment.insertMany([
    { post: posts[0]._id, user: priya._id, content: 'Amazing find! The 1947 issue is a true gem.' },
    { post: posts[0]._id, user: rahul._id, content: 'I have this one too — classic stamp that never disappoints.' },
    { post: posts[1]._id, user: arjun._id, content: 'Wildlife stamps are seriously underrated.' },
    { post: posts[2]._id, user: vikram._id, content: 'ISRO makes the whole country proud!' },
    { post: posts[4]._id, user: arjun._id, content: 'The Master Blaster! 👏' },
    { post: posts[5]._id, user: sneha._id, content: 'Congratulations! Here is to 50 stamps next.' },
    { post: posts[6]._id, user: arjun._id, content: 'I might have an Apollo 11 spare — will check.' },
  ]);

  /* ---------------- Notifications ---------------- */
  // Every notification carries the link it refers to, so the list is
  // actionable rather than just a log.
  await Notification.insertMany([
    {
      user: arjun._id,
      type: 'like',
      message: 'Priya Sharma liked your post',
      read: false,
      link: `/community?post=${posts[0]._id}`,
    },
    {
      user: arjun._id,
      type: 'comment',
      message: 'Rahul Verma commented on your post',
      read: false,
      link: `/community?post=${posts[0]._id}`,
    },
    {
      user: arjun._id,
      type: 'follow',
      message: 'Sneha Patel started following you',
      read: true,
      link: `/profile/sneha`,
    },
    {
      user: arjun._id,
      type: 'achievement',
      message: 'You unlocked the "10 Stamps" achievement',
      read: false,
      link: '/profile',
    },
    {
      user: priya._id,
      type: 'like',
      message: 'Arjun Mehta liked your post',
      read: false,
      link: `/community?post=${posts[1]._id}`,
    },
  ]);

  /* ---------------- Award earned achievements ---------------- */
  // earnedAt is staggered so profiles can show a sensible "earned" timeline.
  const earnedBy = [
    [arjun, [0, 1, 2, 5, 6, 7, 8]],
    [priya, [0, 1, 5, 7]],
    [rahul, [0, 1]],
    [sneha, [0, 1, 8]],
    [vikram, [0, 1]],
  ];
  const day = 24 * 60 * 60 * 1000;
  const rows = [];
  for (const [user, indexes] of earnedBy) {
    indexes.forEach((ai, i) => {
      rows.push({
        user: user._id,
        achievement: ach[ai]._id,
        earnedAt: new Date(Date.now() - (indexes.length - i) * 3 * day),
      });
    });
  }
  await UserAchievement.insertMany(rows);

  console.log('Seed complete:');
  console.log(`  ${countryDocs.length} countries, ${seriesDocs.length} series, ${stamps.length} stamps`);
  console.log(`  ${all.length + 1} users, ${posts.length} posts, ${collectionItems.length} collection items`);
  console.log(`  ${edges.length} follow edges, ${rows.length} earned achievements`);
  console.log('\nDemo credentials:');
  console.log('  Admin: admin@philately.com / admin123');
  console.log('  User:  user@philately.com  / user123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
