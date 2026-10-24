const B = 'http://localhost:5000/api';
const HOST = 'http://localhost:5000';
// Catalogue size is defined by the seed data, not by this file.
const CATALOGUE = require('./data/stamps.json').length;
const { CATEGORIES, THEMES } = require('./utils/taxonomy');
let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
};

const req = async (method, url, { token, body } = {}) => {
  const res = await fetch(B + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
};

(async () => {
  console.log('\n=== 1. AUTH ===');
  const badLogin = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'wrongpass' } });
  ok('wrong password rejected', badLogin.status === 400 && /invalid/i.test(badLogin.data.message), JSON.stringify(badLogin.data));

  const login = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  ok('user login', login.status === 200 && !!login.data.token, JSON.stringify(login.data).slice(0, 120));
  // ut is reassigned after the password-change test rotates credentials.
let ut = login.data.token;
const uid = login.data._id;

  const admin = await req('POST', '/auth/login', { body: { email: 'admin@philately.com', password: 'admin123' } });
  ok('admin login', admin.status === 200 && admin.data.role === 'admin');
  const at = admin.data.token;

  const me = await req('GET', '/auth/me', { token: ut });
  ok('GET /auth/me', me.status === 200 && me.data.username === 'arjun');
  ok('password never returned', me.data.password === undefined);

  const reg = await req('POST', '/auth/register', {
    body: { name: 'Test Collector', username: 'testcollector', email: 'test@philately.com', password: 'test123' },
  });
  ok('register new user', reg.status === 201 && !!reg.data.token, JSON.stringify(reg.data).slice(0, 120));
  const tt = reg.data.token, tid = reg.data._id;

  const dupe = await req('POST', '/auth/register', {
    body: { name: 'Dupe', username: 'testcollector', email: 'other@philately.com', password: 'test123' },
  });
  ok('duplicate username blocked', dupe.status === 400);

  const noAuth = await req('GET', '/collection');
  ok('protected route rejects anonymous', noAuth.status === 401);

  console.log('\n=== 2. STAMPS (catalogue) ===');
  const stamps = await req('GET', '/stamps');
  ok(`GET /stamps returns the full catalogue (${CATALOGUE})`, stamps.status === 200 && stamps.data.length === CATALOGUE, `got ${stamps.data?.length}`);
  ok('every stamp serves a real image file',
    stamps.data.every((s) => typeof s.image === 'string' && s.image.startsWith('/api/stamps/files/')),
    JSON.stringify(stamps.data.filter((s) => !s.image?.startsWith('/api/stamps/files/')).map((s) => s.name)));
  const imageStatus = await Promise.all(
    stamps.data.map(async (s) => ({ name: s.name, status: s.image ? (await fetch(HOST + s.image, { method: 'HEAD' })).status : 0 }))
  );
  ok('every stamp image resolves over HTTP 200',
    imageStatus.every((i) => i.status === 200),
    JSON.stringify(imageStatus.filter((i) => i.status !== 200)));
  ok('every stamp carries a source and licence',
    stamps.data.every((s) => !!s.sourceUrl && !!s.license),
    JSON.stringify(stamps.data.filter((s) => !s.sourceUrl || !s.license).map((s) => s.name)));
  ok('most stamps credit their designer or publisher',
    stamps.data.filter((s) => (s.credit || '').trim()).length >= 30,
    `credited ${stamps.data.filter((s) => (s.credit || '').trim()).length}/${stamps.data.length}`);
  ok('every stamp uses a valid category', stamps.data.every((s) => CATEGORIES.includes(s.category)), JSON.stringify([...new Set(stamps.data.map((s) => s.category))]));
  ok('every stamp uses a valid theme', stamps.data.every((s) => THEMES.includes(s.theme)), JSON.stringify([...new Set(stamps.data.map((s) => s.theme))]));

  const byName = await req('GET', '/stamps?search=tiger');
  ok('search by name', byName.data.some((s) => /tiger/i.test(s.name)));

  const byPerson = await req('GET', '/stamps?search=Gandhi');
  ok('search by depicted person', byPerson.data.length > 0 && byPerson.data.every((s) => /gandhi/i.test(s.person || '')));

  const byThemeSearch = await req('GET', '/stamps?search=Space');
  ok('search matches theme', byThemeSearch.data.length > 0 && byThemeSearch.data.every((s) => /space/i.test(s.theme)));

  const byCountry = await req('GET', '/stamps?country=India');
  ok('filter by country name', byCountry.data.length > 0 && byCountry.data.every((s) => s.countryName === 'India'), `got ${byCountry.data?.length}`);
  const byIso = await req('GET', '/stamps?country=KE');
  ok('filter by ISO alpha-2 code', byIso.data.length > 0 && byIso.data.every((s) => s.country?.iso2 === 'KE'), `got ${byIso.data?.length}`);

  const byYear = await req('GET', '/stamps?year=1947');
  ok('filter by exact year', byYear.data.length === 1 && byYear.data[0].year === 1947, `got ${byYear.data?.length}`);

  const byDecade = await req('GET', '/stamps?decade=1960');
  ok('filter by decade', byDecade.data.length > 0 && byDecade.data.every((s) => s.year >= 1960 && s.year <= 1969), `got ${byDecade.data?.length}`);

  const byRange = await req('GET', '/stamps?fromYear=2004&toYear=2016');
  ok('filter by year range', byRange.data.length > 0 && byRange.data.every((s) => s.year >= 2004 && s.year <= 2016), `got ${byRange.data?.length}`);

  const byCat = await req('GET', '/stamps?category=Science');
  ok('filter by category', byCat.data.length > 0 && byCat.data.every((s) => s.category === 'Science'), `got ${byCat.data?.length}`);

  const byTheme = await req('GET', '/stamps?theme=Space');
  ok('filter by theme', byTheme.data.length > 0 && byTheme.data.every((s) => s.theme === 'Space'), `got ${byTheme.data?.length}`);

  const combined = await req('GET', '/stamps?country=India&theme=Space');
  ok('combined country + theme filters', combined.data.length > 0 && combined.data.every((s) => s.countryName === 'India' && s.theme === 'Space'), `got ${combined.data?.length}`);

  const badCat = await req('GET', '/stamps?category=Alien');
  ok('invalid category rejected with 400', badCat.status === 400, JSON.stringify(badCat.data));
  const badTheme = await req('GET', '/stamps?theme=Alien');
  ok('invalid theme rejected with 400', badTheme.status === 400, JSON.stringify(badTheme.data));

  const sortedOld = await req('GET', '/stamps?sort=oldest');
  ok('sort=oldest is ascending by year', sortedOld.data[0].year <= sortedOld.data[sortedOld.data.length - 1].year, `${sortedOld.data[0]?.year}..${sortedOld.data.at(-1)?.year}`);
  const sortedAz = await req('GET', '/stamps?sort=az');
  ok('sort=az is alphabetical', sortedAz.data[0].name.localeCompare(sortedAz.data.at(-1).name) <= 0, `${sortedAz.data[0]?.name} / ${sortedAz.data.at(-1)?.name}`);

  const counted = await req('GET', '/stamps?country=India&countOnly=true');
  ok('countOnly returns a total', counted.status === 200 && counted.data.total === byCountry.data.length, JSON.stringify(counted.data));

  const countedYear = await req('GET', '/stamps?year=1947&countOnly=true');
  ok('countOnly honours exact year', countedYear.data.total === byYear.data.length, JSON.stringify(countedYear.data));

  const seriesList = await req('GET', '/series');
  const someSeries = seriesList.data[0];
  const bySeriesFilter = await req('GET', `/stamps?series=${someSeries._id}`);
  ok('filter by series id (deep link from Collection Gaps)',
    bySeriesFilter.data.length > 0 && bySeriesFilter.data.every((s) => String(s.series._id) === String(someSeries._id)),
    `${bySeriesFilter.data?.length} vs ${someSeries.name}`);

  // Contradictory year modes must return nothing rather than silently
  // dropping one of the operators and returning unrelated stamps.
  const contradiction = await req('GET', '/stamps?year=1947&decade=1960');
  ok('contradictory year filters return empty, not a partial match',
    contradiction.data.length === 0, `got ${contradiction.data?.length}`);

  const facets = await req('GET', '/stamps/facets');
  ok('facets expose categories, themes and years', facets.status === 200 && facets.data.categories.length > 0 && facets.data.themes.length > 0 && facets.data.years.length > 0);
  ok('facet categories match the taxonomy', facets.data.categories.every((c) => CATEGORIES.includes(c)));
  ok('facet themes match the taxonomy', facets.data.themes.every((t) => THEMES.includes(t)));

  const one = await req('GET', `/stamps/${stamps.data[0]._id}`);
  ok('GET /stamps/:id', one.status === 200 && !!one.data.story);
  ok('stamp detail populates country', !!one.data.country?.iso2, JSON.stringify(one.data.country));
  ok('stamp detail carries full attribution',
    !!one.data.sourceUrl && !!one.data.license && one.data.image.startsWith('/api/stamps/files/'),
    JSON.stringify({ sourceUrl: one.data.sourceUrl, license: one.data.license, credit: one.data.credit, image: one.data.image }));
  ok('404 for bad stamp id', (await req('GET', '/stamps/000000000000000000000000')).status === 404);

  console.log('\n=== 2b. COUNTRIES + SERIES ===');
  const countries = await req('GET', '/countries');
  ok('GET /countries', countries.status === 200 && countries.data.length === 12, `got ${countries.data?.length}`);
  ok('countries carry ISO codes + flag', countries.data.every((c) => c.iso2 && c.iso3 && c.flag && c.region));
  ok('countries expose a stamp count', countries.data.every((c) => typeof c.stampCount === 'number' && c.stampCount > 0));

  const regions = await req('GET', '/countries/regions');
  ok('GET /countries/regions', regions.status === 200 && regions.data.length > 0, JSON.stringify(regions.data));

  const inDetail = await req('GET', '/countries/IN');
  ok('GET /countries/:code', inDetail.status === 200 && inDetail.data.name === 'India' && inDetail.data.iso2 === 'IN');
  ok('country detail includes a timeline', inDetail.data.timeline?.length > 0);
  ok('country detail includes theme breakdown', inDetail.data.themes?.length > 0);
  ok('country detail includes stamp list', inDetail.data.stamps?.length > 0, `got ${inDetail.data.stamps?.length}`);

  const series = await req('GET', '/series');
  ok('GET /series', series.status === 200 && series.data.length === 7, `got ${series.data?.length}`);
  ok('series populate their country', series.data.every((s) => s.country?.name));
  ok('series expose a stamp count', series.data.every((s) => typeof s.stampCount === 'number'));

  const seriesByCountry = await req('GET', '/series?country=IN');
  ok('GET /series?country=', seriesByCountry.status === 200 && seriesByCountry.data.length > 0 && seriesByCountry.data.every((s) => s.country.iso2 === 'IN'), `got ${seriesByCountry.data?.length}`);

  const seriesDetail = await req('GET', `/series/${series.data[0]._id}`);
  ok('GET /series/:id', seriesDetail.status === 200 && !!seriesDetail.data.name);
  ok('series detail lists its stamps', Array.isArray(seriesDetail.data.stamps) && seriesDetail.data.stamps.length > 0);

  // Uniquely named so a re-run never trips the duplicate-user guard above.
  const newSeries = await req('POST', '/series', { token: at, body: { name: 'E2E Test Series', country: 'IN', category: 'Commemorative', theme: 'Culture', issuedFrom: 2020 } });
  ok('admin creates series', newSeries.status === 201, JSON.stringify(newSeries.data).slice(0, 120));
  const editedSeries = await req('PUT', `/series/${newSeries.data._id}`, { token: at, body: { description: 'Updated by e2e' } });
  ok('admin edits series', editedSeries.status === 200 && editedSeries.data.description === 'Updated by e2e');

  const linkedStamp = await req('POST', '/stamps', { token: at, body: { name: 'E2E Linked Stamp', country: 'IN', year: 2021, category: 'Commemorative', theme: 'Culture', series: newSeries.data._id } });
  ok('stamp can reference a series', linkedStamp.status === 201 && linkedStamp.data.series?._id === newSeries.data._id, JSON.stringify(linkedStamp.data?.series));
  const bySeries = await req('GET', `/stamps?series=${newSeries.data._id}`);
  ok('GET /stamps?series=', bySeries.status === 200 && bySeries.data.length === 1 && bySeries.data[0].name === 'E2E Linked Stamp', `got ${bySeries.data?.length}`);

  const deleteBusySeries = await req('DELETE', `/series/${newSeries.data._id}`, { token: at });
  ok('series with stamps cannot be deleted', deleteBusySeries.status === 400, JSON.stringify(deleteBusySeries.data));

  await req('DELETE', `/stamps/${linkedStamp.data._id}`, { token: at });
  const delSeries = await req('DELETE', `/series/${newSeries.data._id}`, { token: at });
  ok('empty series can be deleted', delSeries.status === 200, JSON.stringify(delSeries.data));

  const userSeries = await req('POST', '/series', { token: ut, body: { name: 'Nope', country: 'IN' } });
  ok('non-admin cannot create series', userSeries.status === 403, `got ${userSeries.status}`);
  const anonymousSeries = await req('POST', '/series', { body: { name: 'Nope', country: 'IN' } });
  ok('anonymous cannot create series', anonymousSeries.status === 401, `got ${anonymousSeries.status}`);

  console.log('\n=== 3. COLLECTION ===');
  const coll0 = await req('GET', '/collection', { token: ut });
  ok('user has seeded collection', coll0.data.length === 10, `got ${coll0.data.length}`);

  const owned = new Set(coll0.data.map((i) => i.stamp._id));
  const target = stamps.data.find((s) => !owned.has(s._id));
  ok('found a stamp not yet collected', !!target, target ? '' : 'collection covers all stamps');
  const add = await req('POST', '/collection', { token: ut, body: { stampId: target._id } });
  ok('add stamp to collection', add.status === 201, JSON.stringify(add.data).slice(0, 100));

  const dupAdd = await req('POST', '/collection', { token: ut, body: { stampId: target._id } });
  ok('duplicate add blocked', dupAdd.status === 400);

  const coll1 = await req('GET', '/collection', { token: ut });
  ok('collection grew to 11', coll1.data.length === 11, `got ${coll1.data.length}`);
  ok('collection stamps are populated', coll1.data.every((i) => i.stamp && i.stamp.name));

  const rm = await req('DELETE', `/collection/${target._id}`, { token: ut });
  ok('remove from collection', rm.status === 200);
  const coll2 = await req('GET', '/collection', { token: ut });
  ok('collection back to 10', coll2.data.length === 10, `got ${coll2.data.length}`);

  console.log('\n=== 4. POSTS + LIKES + COMMENTS ===');
  const posts = await req('GET', '/posts');
  ok('GET /posts', posts.status === 200 && posts.data.length === 10);
  ok('posts populate user + stamp', posts.data.every((p) => p.user?.username));

  const created = await req('POST', '/posts', { token: tt, body: { content: 'My very first find!', stamp: stamps.data[0]._id } });
  ok('create post', created.status === 201 && created.data.content === 'My very first find!');
  const newPostId = created.data._id;

  const empty = await req('POST', '/posts', { token: tt, body: { content: '' } });
  ok('empty post rejected', empty.status === 400);

  const like = await req('POST', `/posts/${newPostId}/like`, { token: ut });
  ok('like post', like.status === 200 && like.data.likes.length === 1);
  const unlike = await req('POST', `/posts/${newPostId}/like`, { token: ut });
  ok('unlike toggles off', unlike.data.likes.length === 0);
  await req('POST', `/posts/${newPostId}/like`, { token: ut });

  const cmt = await req('POST', `/posts/${newPostId}/comments`, { token: ut, body: { content: 'Nice one!' } });
  ok('add comment', cmt.status === 201 && cmt.data.content === 'Nice one!');
  const cmtId = cmt.data._id;

  const cl = await req('GET', `/posts/${newPostId}/comments`);
  ok('list comments', cl.data.length === 1);

  const delOwn = await req('DELETE', `/posts/comments/${cmtId}`, { token: ut });
  ok('delete own comment', delOwn.status === 200);
  const badDel = await req('DELETE', `/posts/comments/${cmtId}`, { token: tt });
  ok("cannot delete someone else's comment", badDel.status === 404 || badDel.status === 403);

  const save1 = await req('POST', `/posts/${newPostId}/save`, { token: ut });
  ok('save post', save1.status === 200 && save1.data.saved === true, JSON.stringify(save1.data).slice(0, 100));
  const savedList = await req('GET', '/posts/saved', { token: ut });
  ok('GET /posts/saved lists it', savedList.data.some((p) => p._id === newPostId));
  const save2 = await req('POST', `/posts/${newPostId}/save`, { token: ut });
  ok('unsave toggles off', save2.data.saved === false);
  ok('saved list empty again', (await req('GET', '/posts/saved', { token: ut })).data.length === 0);
  ok('saved requires auth', (await req('GET', '/posts/saved')).status === 401);

  const delOther = await req('DELETE', `/posts/${newPostId}`, { token: ut });
  ok("cannot delete another user's post", delOther.status === 403);
  const delOwnPost = await req('DELETE', `/posts/${newPostId}`, { token: tt });
  ok('delete own post', delOwnPost.status === 200);

  console.log('\n=== 5. PROFILES + FOLLOW ===');
  const self = await req('GET', '/users/me', { token: ut });
  ok('GET /users/me', self.status === 200 && self.data.collectionCount === 10, JSON.stringify({ s: self.status, c: self.data.collectionCount }));
  ok('me has counts + achievements', typeof self.data.postCount === 'number' && Array.isArray(self.data.achievements));

  const other = await req('GET', '/users/priya', { token: ut });
  ok('GET /users/:username', other.status === 200 && other.data.username === 'priya');
  ok('no email/password leaked', other.data.email === undefined && other.data.password === undefined);

  const selfFollow = await req('POST', `/users/${uid}/follow`, { token: ut });
  ok('cannot follow yourself', selfFollow.status === 400);

  const notFollowed = (await req('GET', '/users/vikram', { token: ut })).data;
  const fol = await req('POST', `/users/${notFollowed._id}/follow`, { token: ut });
  ok('follow user', fol.status === 200 && fol.data.following === true, JSON.stringify(fol.data).slice(0, 120));
  ok('follow returns authoritative counts', typeof fol.data.followerCount === 'number' && typeof fol.data.followingCount === 'number',
    JSON.stringify(fol.data));
  const unfol = await req('POST', `/users/${notFollowed._id}/follow`, { token: ut });
  ok('unfollow toggles off', unfol.data.following === false, JSON.stringify(unfol.data).slice(0, 120));
  ok('unfollow restores counts', unfol.data.followerCount === fol.data.followerCount - 1,
    `${unfol.data.followerCount} vs ${fol.data.followerCount}`);

  ok('me reports followerCount', typeof self.data.followerCount === 'number' && self.data.followerCount > 0,
    String(self.data.followerCount));
  const freshSelf = (await req('GET', '/users/me', { token: ut })).data;
  const folList = await req('GET', '/users/arjun/followers', { token: ut });
  ok('GET /users/:username/followers', folList.status === 200 && folList.data.length === freshSelf.followerCount,
    `${folList.data?.length} vs ${freshSelf.followerCount}`);
  ok('follower list carries no password', !folList.data.some((u) => u.password));
  const folInvalid = await req('GET', '/users/ghost/followers', { token: ut });
  ok('followers of unknown user is 404', folInvalid.status === 404);

  const uColl = await req('GET', '/users/priya/collection', { token: ut });
  ok('GET /users/:username/collection', uColl.status === 200 && uColl.data.length === 5);
  const uPosts = await req('GET', '/users/priya/posts', { token: ut });
  ok('GET /users/:username/posts', uPosts.status === 200 && uPosts.data.length === 2);

  const prof = await req('PUT', '/users/profile', { token: ut, body: { name: 'Arjun Mehta', bio: 'Updated bio', profileImage: '' } });
  ok('update own profile', prof.status === 200 && prof.data.bio === 'Updated bio');
  const badInterests = await req('PUT', '/users/profile', { token: ut, body: { interests: 'Space' } });
  ok('interests must be an array', badInterests.status === 400, JSON.stringify(badInterests.data));
  const setInterests = await req('PUT', '/users/profile', { token: ut, body: { interests: ['Space', 'Wildlife', '  '] } });
  ok('interests save and trim', setInterests.status === 200 && setInterests.data.interests.length === 2,
    JSON.stringify(setInterests.data.interests));

  console.log('\n=== 5b. ACCOUNT SETTINGS ===');
  const noAuthSettings = await req('GET', '/users/settings');
  ok('settings requires auth', noAuthSettings.status === 401);

  const settings = await req('GET', '/users/settings', { token: ut });
  ok('GET /users/settings', settings.status === 200 && typeof settings.data.isPrivate === 'boolean' &&
    Array.isArray(settings.data.interests) && typeof settings.data.notifyLikes === 'boolean',
    JSON.stringify(settings.data));

  const privacyOn = await req('PUT', '/users/settings/privacy', { token: ut, body: { isPrivate: true } });
  ok('set private', privacyOn.status === 200 && privacyOn.data.isPrivate === true);
  const badPrivacy = await req('PUT', '/users/settings/privacy', { token: ut, body: { isPrivate: 'yes' } });
  ok('non-boolean privacy rejected', badPrivacy.status === 400, JSON.stringify(badPrivacy.data));

  const selfPrivate = await req('GET', '/users/arjun', { token: ut });
  ok('owner still sees own private profile', selfPrivate.status === 200 && selfPrivate.data.canView === true);

  // Every seeded collector follows arjun, so the freshly registered test user
  // is the only account that must be blocked.
  const arjunId = (await req('GET', '/users/arjun', { token: tt })).data._id;
  const nonFollowerSees = await req('GET', '/users/arjun', { token: tt });
  ok('non-follower of a private profile gets canView=false', nonFollowerSees.data.canView === false,
    JSON.stringify({ canView: nonFollowerSees.data.canView }));
  const blockedColl = await req('GET', '/users/arjun/collection', { token: tt });
  ok('private profile blocks collection', blockedColl.status === 403 && blockedColl.data.isPrivate === true,
    JSON.stringify(blockedColl.data));
  const blockedPosts = await req('GET', '/users/arjun/posts', { token: tt });
  ok('private profile blocks posts', blockedPosts.status === 403);

  await req('POST', `/users/${arjunId}/follow`, { token: tt });
  const allowedColl = await req('GET', '/users/arjun/collection', { token: tt });
  ok('follower can see private collection', allowedColl.status === 200 && allowedColl.data.length === 10,
    `${allowedColl.status} ${allowedColl.data?.length}`);

  // The profile card must agree with the content endpoints: it used to keep
  // reporting canView=false after a follow, so the UI stayed on the locked
  // panel even though the data was reachable.
  const followerSees = await req('GET', '/users/arjun', { token: tt });
  ok('follower of a private profile gets canView=true',
    followerSees.data.canView === true && followerSees.data.isFollowing === true,
    JSON.stringify({ canView: followerSees.data.canView, isFollowing: followerSees.data.isFollowing }));
  ok('canView agrees with what the collection endpoint allows',
    followerSees.data.canView === (allowedColl.status === 200),
    `${followerSees.data.canView} vs ${allowedColl.status}`);

  const privacyOff = await req('PUT', '/users/settings/privacy', { token: ut, body: { isPrivate: false } });
  ok('set public again', privacyOff.data.isPrivate === false);
  await req('POST', `/users/${arjunId}/follow`, { token: tt });

  const notifsUpdate = await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyLikes: false, notifyComments: false } });
  ok('update notifications', notifsUpdate.status === 200 && notifsUpdate.data.notifyLikes === false &&
    notifsUpdate.data.notifyComments === false && notifsUpdate.data.notifyFollows === true,
    JSON.stringify(notifsUpdate.data));
  const badNotif = await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyLikes: 'nope' } });
  ok('non-boolean notification rejected', badNotif.status === 400);
  const emptyNotif = await req('PUT', '/users/settings/notifications', { token: ut, body: {} });
  ok('empty notification update rejected', emptyNotif.status === 400);
  await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyLikes: true, notifyComments: true } });

  const wrongPw = await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'nope', newPassword: 'brandnew1' } });
  ok('wrong current password rejected', wrongPw.status === 401, JSON.stringify(wrongPw.data));
  const shortPw = await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'user123', newPassword: 'abc' } });
  ok('short new password rejected', shortPw.status === 400);
  const samePw = await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'user123', newPassword: 'user123' } });
  ok('unchanged password rejected', samePw.status === 400);
  const noPw = await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'user123' } });
  ok('missing new password rejected', noPw.status === 400);

  const changedPw = await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'user123', newPassword: 'arjun789' } });
  ok('change password', changedPw.status === 200);
  const oldPwLogin = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  ok('old password no longer works', oldPwLogin.status === 400);
  const newPwLogin = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'arjun789' } });
  ok('new password works', newPwLogin.status === 200);
  ut = newPwLogin.data.token;
  await req('PUT', '/users/settings/change-password', { token: ut, body: { currentPassword: 'arjun789', newPassword: 'user123' } });
  const restoredPw = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  ok('password restored for later sections', restoredPw.status === 200);
  ut = restoredPw.data.token;

  console.log('\n=== 5c. NOTIFICATION PREFERENCES ARE HONOURED ===');
  // The actor must be someone other than the recipient, otherwise the
  // "never notify yourself" rule would mask the preference entirely.
  const arjunPostId = (await req('GET', '/users/arjun/posts', { token: ut })).data[0]._id;
  ok('setup for preference test', (await req('GET', '/users/me', { token: ut })).data.username === 'arjun' && !!arjunPostId);

  // Like is a toggle, so each attempt must start from the unliked state.
  await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyLikes: false } });
  const nBefore = (await req('GET', '/notifications', { token: ut })).data.length;
  await req('POST', `/posts/${arjunPostId}/like`, { token: tt });
  const nAfter = (await req('GET', '/notifications', { token: ut })).data.length;
  ok('likes suppressed when notifyLikes is off', nAfter === nBefore, `${nBefore} -> ${nAfter}`);
  await req('POST', `/posts/${arjunPostId}/like`, { token: tt });
  await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyLikes: true } });
  await req('POST', `/posts/${arjunPostId}/like`, { token: tt });
  const nRestored = (await req('GET', '/notifications', { token: ut })).data.length;
  ok('likes notify when re-enabled', nRestored === nBefore + 1, `${nBefore} -> ${nRestored}`);
  await req('POST', `/posts/${arjunPostId}/like`, { token: tt });

  await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyComments: false } });
  const cBefore = (await req('GET', '/notifications', { token: ut })).data.length;
  await req('POST', `/posts/${arjunPostId}/comments`, { token: tt, body: { content: 'lovely issue' } });
  const cAfter = (await req('GET', '/notifications', { token: ut })).data.length;
  ok('comments suppressed when notifyComments is off', cAfter === cBefore, `${cBefore} -> ${cAfter}`);
  await req('PUT', '/users/settings/notifications', { token: ut, body: { notifyComments: true } });
  await req('POST', `/posts/${arjunPostId}/comments`, { token: tt, body: { content: 'still lovely' } });
  const cRestored = (await req('GET', '/notifications', { token: ut })).data.length;
  ok('comments notify when re-enabled', cRestored === cBefore + 1, `${cBefore} -> ${cRestored}`);

  // A badge only fires once per achievement, so each half of this test needs its
  // own fresh user rather than trying to reuse already-earned badges.
  const achCount = async (token) =>
    (await req('GET', '/notifications', { token })).data.filter((n) => n.type === 'achievement').length;
  const oldest = (await req('GET', '/stamps?sort=oldest')).data;

  const quietUser = (await req('POST', '/auth/register', {
    body: { name: 'Quiet Collector', username: 'quietcollector', email: 'quiet@philately.com', password: 'test123' },
  })).data;
  await req('PUT', '/users/settings/notifications', { token: quietUser.token, body: { notifyAchievements: false } });
  await req('POST', '/collection', { token: quietUser.token, body: { stampId: oldest[0]._id } });
  const quietAch = await achCount(quietUser.token);
  const quietBadges = (await req('GET', '/users/me', { token: quietUser.token })).data.achievements;
  ok('achievement still unlocks while opted out',
    quietBadges.some((a) => a.name === 'First Stamp'), JSON.stringify(quietBadges.map((a) => a.name)));
  ok('achievement notifications suppressed when opted out', quietAch === 0, `got ${quietAch}`);

  const loudUser = (await req('POST', '/auth/register', {
    body: { name: 'Loud Collector', username: 'loudcollector', email: 'loud@philately.com', password: 'test123' },
  })).data;
  await req('POST', '/collection', { token: loudUser.token, body: { stampId: oldest[0]._id } });
  const loudAch = await achCount(loudUser.token);
  // The oldest stamp is a definitive, so it unlocks the First Stamp badge alone.
  ok('achievement notifications sent by default', loudAch >= 1, `got ${loudAch}`);
  ok('achievement notification names the badge',
    (await req('GET', '/notifications', { token: loudUser.token })).data.some((n) => /First Stamp/.test(n.message)));

  console.log('\n=== 5d. COLLECTION GAPS + PASSPORT ===');
  const gaps = await req('GET', '/collection/gaps', { token: ut });
  ok('GET /collection/gaps', gaps.status === 200, JSON.stringify(gaps.data?.totals));
  ok('gaps totals are consistent',
    gaps.data.totals.catalogue === CATALOGUE && gaps.data.totals.owned === 10 && gaps.data.totals.missing === CATALOGUE - 10 &&
    gaps.data.totals.owned + gaps.data.totals.missing === gaps.data.totals.catalogue,
    JSON.stringify(gaps.data.totals));
  ok('gaps group by country and series', gaps.data.countries.length === 12 && gaps.data.series.length > 0,
    `countries=${gaps.data.countries.length} series=${gaps.data.series.length}`);
  ok('gaps only list incomplete series', gaps.data.series.every((s) => s.missingCount > 0));
  ok('gaps are sorted least-complete first',
    gaps.data.countries.every((c, i, arr) => i === 0 || arr[i - 1].percent <= c.percent));
  const gapEntry = gaps.data.countries.find((c) => c.missingCount > 0);
  ok('each gap entry names its missing stamps',
    gapEntry.missing.length === gapEntry.missingCount &&
    gapEntry.missing.every((m) => m._id && m.name),
    JSON.stringify(gapEntry.missing[0]));
  ok('missing stamps carry series/category/theme hints',
    gapEntry.missing.every((m) => m.category && m.theme && 'series' in m));
  const noAuthGaps = await req('GET', '/collection/gaps');
  ok('gaps requires auth', noAuthGaps.status === 401);

  const passport = await req('GET', '/collection/passport', { token: ut });
  ok('GET /collection/passport', passport.status === 200, JSON.stringify(passport.data?.summary));
  ok('passport counts every catalogue country', passport.data.pages.length === 12);
  ok('passport summary matches the catalogue',
    passport.data.summary.catalogueStamps === CATALOGUE &&
    passport.data.summary.stampsOwned === 10 &&
    passport.data.summary.countriesInCatalogue === 12,
    JSON.stringify(passport.data.summary));
  const startedPages = passport.data.pages.filter((p) => p.total > 0);
  ok('passport per-country totals sum to the catalogue',
    startedPages.reduce((n, p) => n + p.total, 0) === CATALOGUE);
  ok('passport owned never exceeds total',
    passport.data.pages.every((p) => p.owned <= p.total));
  ok('passport percent is derived from owned/total',
    passport.data.pages.every((p) => p.percent === Math.round((p.owned / p.total) * 100)));
  ok('passport sorted least-complete first',
    passport.data.pages.every((p, i, arr) => i === 0 || arr[i - 1].percent <= p.percent));
  const startedTotals = passport.data.pages.filter((p) => p.total > 0);
  const expectedOverall = Math.round(
    (startedTotals.reduce((s, p) => s + p.owned, 0) /
      startedTotals.reduce((s, p) => s + p.total, 0)) * 100
  );
  ok('passport overall percent is owned over total, not a sum of percents',
    passport.data.summary.percent === expectedOverall && passport.data.summary.percent <= 100,
    `${passport.data.summary.percent} vs ${expectedOverall}`);
  ok('passport flags a completed country',
    passport.data.pages.some((p) => p.completed && p.owned === p.total),
    JSON.stringify(passport.data.pages.filter((p) => p.completed).map((p) => p.country.iso2)));
  ok('passport reports category coverage from the shared taxonomy',
    passport.data.pages.some((p) => p.byCategory.every((c) => CATEGORIES.includes(c.category))));
  const noAuthPassport = await req('GET', '/collection/passport');
  ok('passport requires auth', noAuthPassport.status === 401);

  // Removing a stamp must widen the gap set, proving it is derived not stored.
  const removable = (await req('GET', '/collection', { token: ut })).data[0].stamp._id;
  await req('DELETE', `/collection/${removable}`, { token: ut });
  const gapsAfter = await req('GET', '/collection/gaps', { token: ut });
  ok('gaps react to collection changes', gapsAfter.data.totals.owned === 9 && gapsAfter.data.totals.missing === CATALOGUE - 9,
    JSON.stringify(gapsAfter.data.totals));
  await req('POST', '/collection', { token: ut, body: { stampId: removable } });
  const gapsRestored = await req('GET', '/collection/gaps', { token: ut });
  ok('gaps restored after re-adding', gapsRestored.data.totals.owned === 10);

  console.log('\n=== 6. NOTIFICATIONS ===');
  const notifs = await req('GET', '/notifications', { token: ut });
  ok('GET /notifications', notifs.status === 200 && notifs.data.length >= 4);
  ok('has unread', notifs.data.some((n) => !n.read));
  const read = await req('PUT', `/notifications/${notifs.data[0]._id}/read`, { token: ut });
  ok('mark one read', read.status === 200 && read.data.read === true);
  const readAll = await req('PUT', '/notifications/read-all', { token: ut });
  ok('mark all read', readAll.status === 200);
  const after = await req('GET', '/notifications', { token: ut });
  ok('no unread remain', after.data.every((n) => n.read));

  console.log('\n=== 7. ACHIEVEMENTS (auto-unlock) ===');
  const fresh = await req('POST', '/auth/register', {
    body: { name: 'New Collector', username: 'newcollector', email: 'new@philately.com', password: 'test123' },
  });
  const nt = fresh.data.token;
  const beforeMe = await req('GET', '/users/me', { token: nt });
  ok('new user has no achievements', beforeMe.data.achievements.length === 0);

  await req('POST', '/collection', { token: nt, body: { stampId: byCat.data[0]._id } });
  const afterStamp = await req('GET', '/users/me', { token: nt });
  ok('First Stamp auto-unlocks', afterStamp.data.achievements.some((a) => a.name === 'First Stamp'),
    JSON.stringify(afterStamp.data.achievements.map((a) => a.name)));
  ok('First Post stays locked with 0 posts', !afterStamp.data.achievements.some((a) => a.name === 'First Post'),
    JSON.stringify(afterStamp.data.achievements.map((a) => a.name)));
  ok('10 Stamps stays locked with 1 stamp', !afterStamp.data.achievements.some((a) => a.name === '10 Stamps'));
  ok('Contributor stays locked with 0 posts', !afterStamp.data.achievements.some((a) => a.name === 'Community Contributor'));

  const histStamp = (await req('GET', '/stamps?category=Historical')).data[0];
  await req('POST', '/collection', { token: nt, body: { stampId: histStamp._id } });
  const afterHist = await req('GET', '/users/me', { token: nt });
  ok('History Explorer auto-unlocks', afterHist.data.achievements.some((a) => a.name === 'History Explorer'),
    JSON.stringify(afterHist.data.achievements.map((a) => a.name)));

  await req('POST', '/posts', { token: nt, body: { content: 'hello' } });
  const afterPost = await req('GET', '/users/me', { token: nt });
  ok('First Post auto-unlocks', afterPost.data.achievements.some((a) => a.name === 'First Post'));
  ok('achievements do not duplicate',
    new Set(afterPost.data.achievements.map((a) => a._id)).size === afterPost.data.achievements.length,
    JSON.stringify(afterPost.data.achievements.map((a) => a.name)));

  await req('POST', '/collection', { token: nt, body: { stampId: histStamp._id } });
  const noDup = await req('GET', '/users/me', { token: nt });
  ok('repeat action keeps achievements unique',
    new Set(noDup.data.achievements.map((a) => a._id)).size === noDup.data.achievements.length,
    JSON.stringify(noDup.data.achievements.map((a) => a.name)));

  console.log('\n=== 7b. ACHIEVEMENTS (parallel unlock is race-safe) ===');
  // Eight concurrent checks race for the same badges. A duplicate-key error from
  // the unique (user, achievement) index must be absorbed per row, otherwise it
  // aborts that pass and silently drops the badges/notification after it.
  const mongoose = require('mongoose');
  const UserAchievement = require('./models/UserAchievement');
  const CollectionModel = require('./models/Collection');
  const { checkAndUnlockAchievements } = require('./utils/achievements');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/national_philately');

  const raceReg = await req('POST', '/auth/register', {
    body: { name: 'Race Collector', username: 'racecollector', email: 'race@philately.com', password: 'test123' },
  });
  const raceId = raceReg.data._id;
  // Insert the stamp directly so the unlock is decided by the parallel checks,
  // not by the API call's own single-threaded check.
  await CollectionModel.create({ user: raceId, stamp: histStamp._id });

  const races = await Promise.all(Array.from({ length: 8 }, () => checkAndUnlockAchievements(raceId)));
  const raceMe = await req('GET', '/users/me', { token: raceReg.data.token });
  const raceNames = raceMe.data.achievements.map((a) => a.name);
  const rows = await UserAchievement.find({ user: raceId });

  ok('parallel checks return without error',
    races.every((r) => Array.isArray(r)), JSON.stringify(races));
  ok('parallel checks grant every eligible badge',
    raceNames.includes('First Stamp') && raceNames.includes('History Explorer'),
    JSON.stringify(raceNames));
  ok('parallel checks leave exactly one row per badge',
    rows.length === 2 && new Set(rows.map((r) => String(r.achievement))).size === 2,
    `rows=${rows.length}`);
  const raceNotifs = (await req('GET', '/notifications', { token: raceReg.data.token }))
    .data.filter((n) => n.type === 'achievement');
  ok('parallel checks notify exactly once per badge',
    raceNotifs.length === raceNames.length,
    `notifs=${raceNotifs.length} badges=${raceNames.length}`);
  await mongoose.disconnect();

  console.log('\n=== 8. ADMIN ===');
  const stats = await req('GET', '/admin/stats', { token: at });
  ok('GET /admin/stats', stats.status === 200 && stats.data.totalStamps === CATALOGUE && stats.data.totalUsers >= 6,
    JSON.stringify(stats.data));

  const forbidden = await req('GET', '/admin/stats', { token: ut });
  ok('non-admin blocked from admin', forbidden.status === 403);

  const noAuthAdmin = await req('GET', '/admin/users');
  ok('anonymous blocked from admin', noAuthAdmin.status === 401);

  const adminUsers = await req('GET', '/admin/users', { token: at });
  ok('GET /admin/users', adminUsers.status === 200 && !adminUsers.data.some((u) => u.password));

  const targetUser = adminUsers.data.find((u) => u.username === 'vikram');
  const tog = await req('PUT', `/admin/users/${targetUser._id}/toggle`, { token: at });
  ok('deactivate user', tog.status === 200 && tog.data.isActive === false);
  const blocked = await req('POST', '/auth/login', { body: { email: targetUser.email, password: 'user123' } });
  ok('deactivated user cannot login', blocked.status === 400 && /deactivat/i.test(blocked.data.message));
  await req('PUT', `/admin/users/${targetUser._id}/toggle`, { token: at });

  const adminSelf = await req('PUT', `/admin/users/${adminUsers.data.find((u) => u.role === 'admin')._id}/toggle`, { token: at });
  ok('cannot deactivate an admin', adminSelf.status === 400, JSON.stringify(adminSelf.data));

  const adminStamps = await req('GET', '/admin/stamps', { token: at });
  ok('GET /admin/stamps', adminStamps.status === 200 && adminStamps.data.length === CATALOGUE, `got ${adminStamps.data?.length}`);

  const newStamp = await req('POST', '/stamps', {
    token: at,
    body: { name: 'Test Issue', country: 'IN', year: 2024, category: 'Commemorative', theme: 'Culture', denomination: '₹10' },
  });
  ok('admin creates stamp', newStamp.status === 201, JSON.stringify(newStamp.data).slice(0, 120));
  ok('created stamp resolves its country', newStamp.data.countryName === 'India' && newStamp.data.country?.iso2 === 'IN', JSON.stringify(newStamp.data?.country));

  const editStamp = await req('PUT', `/stamps/${newStamp.data._id}`, { token: at, body: { denomination: '₹20', theme: 'Art' } });
  ok('admin edits stamp', editStamp.status === 200 && editStamp.data.denomination === '₹20' && editStamp.data.theme === 'Art');

  const badThemeStamp = await req('POST', '/stamps', { token: at, body: { name: 'Bad', country: 'IN', year: 2024, category: 'Commemorative', theme: 'Alien' } });
  ok('invalid theme rejected on create', badThemeStamp.status === 400, JSON.stringify(badThemeStamp.data));
  const badCountryStamp = await req('POST', '/stamps', { token: at, body: { name: 'Bad', country: 'Atlantis', year: 2024, category: 'Commemorative', theme: 'Culture' } });
  ok('unknown country rejected on create', badCountryStamp.status === 400, JSON.stringify(badCountryStamp.data));

  const userCreate = await req('POST', '/stamps', { token: ut, body: { name: 'Hack', country: 'IN', year: 2000, category: 'Commemorative', theme: 'Culture' } });
  ok('non-admin cannot create stamp', userCreate.status === 403);

  const delStamp = await req('DELETE', `/stamps/${newStamp.data._id}`, { token: at });
  ok('admin deletes stamp', delStamp.status === 200);

  // Image upload: a data URL in, a served file url out, junk rejected.
  const fs = require('fs');
  const path = require('path');
  const stampDir = path.join(__dirname, 'public', 'stamps');
  const sampleName = fs.readdirSync(stampDir).find((f) => /\.(jpe?g|png)$/i.test(f));
  const sampleBuf = fs.readFileSync(path.join(stampDir, sampleName));
  const sampleUrl = `data:image/${/\.png$/i.test(sampleName) ? 'png' : 'jpeg'};base64,${sampleBuf.toString('base64')}`;
  const uploaded = await req('POST', '/stamps/upload', { token: at, body: { image: sampleUrl, name: 'E2E Uploaded Stamp' } });
  ok('admin uploads a stamp image', uploaded.status === 201 && uploaded.data.image.startsWith('/api/stamps/files/'), JSON.stringify(uploaded.data).slice(0, 160));
  const uploadHead = await fetch(HOST + uploaded.data.image, { method: 'HEAD' });
  ok('uploaded image is served over HTTP 200', uploadHead.status === 200, `status=${uploadHead.status}`);
  const junkUpload = await req('POST', '/stamps/upload', { token: at, body: { image: `data:image/png;base64,${Buffer.from('definitely not an image').toString('base64')}` } });
  ok('non-image upload rejected', junkUpload.status === 400, JSON.stringify(junkUpload.data));
  ok('anonymous cannot upload', (await req('POST', '/stamps/upload', { body: { image: sampleUrl } })).status === 401);
  ok('non-admin cannot upload', (await req('POST', '/stamps/upload', { token: ut, body: { image: sampleUrl } })).status === 403);

  const withImage = await req('POST', '/stamps', {
    token: at,
    body: {
      name: 'E2E Image Stamp', country: 'IN', year: 2025, category: 'Commemorative', theme: 'Culture',
      description: 'Created by the e2e run.', image: uploaded.data.image, credit: 'e2e run', license: 'Public domain',
    },
  });
  ok('admin creates a stamp with an image',
    withImage.status === 201 && withImage.data.image === uploaded.data.image, JSON.stringify(withImage.data).slice(0, 160));
  ok('attribution is stored on create',
    withImage.data.credit === 'e2e run' && withImage.data.license === 'Public domain',
    JSON.stringify({ credit: withImage.data.credit, license: withImage.data.license }));
  const viewerSees = await req('GET', `/stamps/${withImage.data._id}`);
  ok('new stamp is publicly readable with its image', viewerSees.status === 200 && viewerSees.data.image === uploaded.data.image);
  await req('DELETE', `/stamps/${withImage.data._id}`, { token: at });
  const uploadedFile = path.join(stampDir, uploaded.data.image.split('/').pop());
  if (fs.existsSync(uploadedFile)) fs.unlinkSync(uploadedFile);
  ok('uploaded test file cleaned up', !fs.existsSync(uploadedFile));

  const adminPosts = await req('GET', '/admin/posts', { token: at });
  ok('GET /admin/posts', adminPosts.status === 200);
  const adminDel = await req('DELETE', `/admin/posts/${adminPosts.data[0]._id}`, { token: at });
  ok('admin deletes post', adminDel.status === 200);

  console.log('\n=== 9. LOGIN METHODS ===');
  const byUsername = await req('POST', '/auth/login', { body: { username: 'arjun', password: 'user123' } });
  ok('login by username', byUsername.status === 200 && byUsername.data.username === 'arjun', JSON.stringify(byUsername.data).slice(0, 120));

  const byEmail = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  ok('login by email', byEmail.status === 200 && byEmail.data._id === byUsername.data._id, JSON.stringify(byEmail.data).slice(0, 120));

  const byCase = await req('POST', '/auth/login', { body: { username: 'ARJUN', password: 'user123' } });
  ok('login identifier ignores case', byCase.status === 200);

  const noSuchUser = await req('POST', '/auth/login', { body: { username: 'nobody-here', password: 'user123' } });
  ok('unknown identifier rejected', noSuchUser.status === 400 && /invalid/i.test(noSuchUser.data.message));

  const noPassword = await req('POST', '/auth/login', { body: { username: 'arjun' } });
  ok('login without a password is rejected', noPassword.status === 400);

  // "Remember me" decides how long the token stays usable.
  const jwt = require('jsonwebtoken');
  const shortSession = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123', remember: false } });
  const longSession = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123', remember: true } });
  const shortLife = jwt.decode(shortSession.data.token).exp - jwt.decode(shortSession.data.token).iat;
  const longLife = jwt.decode(longSession.data.token).exp - jwt.decode(longSession.data.token).iat;
  ok('remember me lengthens the session', shortLife === 12 * 3600 && longLife === 30 * 24 * 3600, `short=${shortLife} long=${longLife}`);

  const providers = await req('GET', '/auth/providers');
  ok('auth providers endpoint answers', providers.status === 200 && typeof providers.data.google === 'boolean', JSON.stringify(providers.data));

  const googleStart = await fetch(B + '/auth/google', { redirect: 'manual' });
  ok('google sign-in redirects or reports that it is unconfigured',
    googleStart.status === 302 || googleStart.status === 503, `status=${googleStart.status}`);

  const googleCallback = await fetch(B + '/auth/google/callback?code=fake&state=fake', { redirect: 'manual' });
  const callbackLocation = googleCallback.headers.get('location') || '';
  ok('google callback rejects an unknown state',
    googleCallback.status === 302 && /error=oauth_state/.test(callbackLocation), `status=${googleCallback.status} loc=${callbackLocation}`);

  // A burst of wrong passwords for one identity is throttled, and the throttle
  // is scoped to that identity rather than to the whole address.
  let limited = false;
  let throttleStatus = 0;
  for (let i = 0; i < 12; i += 1) {
    const attempt = await req('POST', '/auth/login', { body: { username: 'throttle-probe', password: 'wrong' } });
    throttleStatus = attempt.status;
    if (attempt.status === 429) { limited = true; break; }
  }
  ok('repeated failed logins are rate limited', limited, `status=${throttleStatus}`);
  const otherUser = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  ok('throttling one identity does not lock out another', otherUser.status === 200);

  console.log('\n=== 10. PAGINATION ===');
  const allStamps = await req('GET', '/stamps');
  ok('without paging the whole catalogue comes back',
    allStamps.status === 200 && allStamps.data.length === CATALOGUE, `len=${allStamps.data.length} catalogue=${CATALOGUE}`);
  ok('without paging no paging headers are sent', !allStamps.headers.get('x-total-count'));

  const stampPage1 = await req('GET', '/stamps?page=1&limit=10');
  ok('stamps page 1 returns the requested window', stampPage1.status === 200 && stampPage1.data.length === 10, `len=${stampPage1.data.length}`);
  ok('stamps page 1 reports the total', stampPage1.headers.get('x-total-count') === String(CATALOGUE), `total=${stampPage1.headers.get('x-total-count')}`);
  ok('stamps page 1 reports its position', stampPage1.headers.get('x-page') === '1' && stampPage1.headers.get('x-limit') === '10');

  const stampPage2 = await req('GET', '/stamps?page=2&limit=10');
  const page1Ids = new Set(stampPage1.data.map((s) => s._id));
  const page2Ids = stampPage2.data.map((s) => s._id);
  ok('consecutive pages do not overlap', page2Ids.every((id) => !page1Ids.has(id)));
  ok('a page is sorted the same way as the whole list',
    JSON.stringify(stampPage1.data.map((s) => s._id)) === JSON.stringify(allStamps.data.slice(0, 10).map((s) => s._id)));

  const totalPages = Number(stampPage1.headers.get('x-total-pages'));
  const lastPage = await req('GET', `/stamps?page=${totalPages}&limit=10`);
  ok('the last page holds exactly the remainder',
    lastPage.data.length === CATALOGUE - (totalPages - 1) * 10, `got=${lastPage.data.length}`);

  const beyond = await req('GET', '/stamps?page=999&limit=10');
  ok('a page past the end is empty', beyond.status === 200 && beyond.data.length === 0);

  const capped = await req('GET', '/stamps?limit=9999');
  ok('the page size is capped', capped.headers.get('x-limit') === '60', `limit=${capped.headers.get('x-limit')}`);

  const session = await req('POST', '/auth/login', { body: { email: 'user@philately.com', password: 'user123' } });
  const st = session.data.token;
  const allPosts = await req('GET', '/posts', { token: st });
  const postPage = await req('GET', '/posts?page=1&limit=3', { token: st });
  ok('posts page 1 returns the requested window', postPage.data.length === 3, `len=${postPage.data.length}`);
  ok('posts report the total', postPage.headers.get('x-total-count') === String(allPosts.data.length), `total=${postPage.headers.get('x-total-count')}`);

  const notifPage = await req('GET', '/notifications?page=1&limit=2', { token: st });
  ok('notifications page 1 returns the requested window', notifPage.data.length === 2, `len=${notifPage.data.length}`);
  ok('notifications report the total', Number(notifPage.headers.get('x-total-count')) >= 2);

  console.log('\n=== 11. NOTIFICATIONS, LINKS AND CASCADES ===');
  const unread = await req('GET', '/notifications/unread-count', { token: st });
  ok('unread count endpoint answers', unread.status === 200 && typeof unread.data.count === 'number', JSON.stringify(unread.data));
  const notifList = await req('GET', '/notifications', { token: st });
  ok('notifications carry the link they refer to', notifList.data.every((n) => typeof n.link === 'string' && n.link.startsWith('/')), JSON.stringify(notifList.data.map((n) => n.link)));

  const single = await req('GET', `/posts/${allPosts.data[0]._id}`, { token: st });
  ok('GET /posts/:id returns that post', single.status === 200 && single.data._id === allPosts.data[0]._id);
  const missingPost = await req('GET', '/posts/000000000000000000000000');
  ok('GET /posts/:id is a 404 for an unknown id', missingPost.status === 404);

  // Deleting a post takes its comments and its notifications with it.
  const doomed = await req('POST', '/posts', { token: st, body: { content: 'This post is about to be deleted.' } });
  ok('created a post to delete', doomed.status === 201);
  const commentOnIt = await req('POST', `/posts/${doomed.data._id}/comments`, { token: at, body: { content: 'A comment that must not survive.' } });
  ok('commented on the doomed post', commentOnIt.status === 201);
  const before = await req('GET', `/posts/${doomed.data._id}/comments`, { token: st });
  ok('the comment is there', before.data.length === 1);
  const notified = await req('GET', '/notifications', { token: st });
  ok('the comment produced a notification pointing at the post',
    notified.data.some((n) => n.link === `/community?post=${doomed.data._id}`));
  const deleted = await req('DELETE', `/posts/${doomed.data._id}`, { token: st });
  ok('post deleted', deleted.status === 200);
  const afterComments = await req('GET', `/posts/${doomed.data._id}/comments`, { token: st });
  ok('the comments went with the post', afterComments.status === 404);
  const afterNotifications = await req('GET', '/notifications', { token: st });
  ok('the notifications about the post went with it',
    !afterNotifications.data.some((n) => n.link === `/community?post=${doomed.data._id}`));

  console.log('\n=== 12. PRIVATE FEED ISOLATION ===');
  const privReg = await req('POST', '/auth/register', {
    body: { name: 'Private Collector', username: 'privcollector', email: 'priv@philately.com', password: 'priv123' },
  });
  ok('registered a private collector', privReg.status === 201);
  const pt = privReg.data.token;
  const pid = privReg.data._id;
  await req('PUT', '/users/settings/privacy', { token: pt, body: { isPrivate: true } });
  const privPost = await req('POST', '/posts', { token: pt, body: { content: 'A private collector post that must stay hidden.' } });
  ok('private collector created a post', privPost.status === 201);

  const anonFeed = await req('GET', '/posts');
  ok('anonymous feed hides a private collector post', !anonFeed.data.some((p) => p._id === privPost.data._id));

  const otherFeed = await req('GET', '/posts', { token: st });
  ok('a non-follower feed hides a private collector post', !otherFeed.data.some((p) => p._id === privPost.data._id));

  const direct = await req('GET', `/posts/${privPost.data._id}`);
  ok('a private post cannot be opened directly', direct.status === 403 && direct.data.isPrivate === true, JSON.stringify(direct.data));

  const directComments = await req('GET', `/posts/${privPost.data._id}/comments`);
  ok('a private post keeps its comments private', directComments.status === 403);

  const follow = await req('POST', `/users/${pid}/follow`, { token: st });
  ok('followed the private collector', follow.status === 200 && follow.data.following === true, JSON.stringify(follow.data));

  const followerFeed = await req('GET', '/posts', { token: st });
  ok('a follower sees the private post in the feed', followerFeed.data.some((p) => p._id === privPost.data._id));

  const followerDirect = await req('GET', `/posts/${privPost.data._id}`, { token: st });
  ok('a follower can open the private post', followerDirect.status === 200);

  await req('DELETE', `/posts/${privPost.data._id}`, { token: pt });
  await req('PUT', '/users/settings/privacy', { token: pt, body: { isPrivate: false } });
  ok('private feed test cleaned up', true);

  console.log(`\n================  ${pass} passed, ${fail} failed  ================\n`);
  process.exit(fail ? 1 : 0);
})();