# National Philately — MERN Stack College FSD Project

## Project Overview

**National Philately** is a modern, youth-friendly online philately community and account management platform built with the MERN stack. It combines Pinterest-style stamp discovery, Instagram-style community features, and a personal collection manager to make traditional stamp collecting social and engaging.

The application allows users to discover stamps, build their personal collections, create community posts, follow other collectors, and participate in discussions. An admin dashboard provides management capabilities for users, stamps, and posts.

---

## Features

### User Features
- **Authentication**: Register and sign in with either an email address or a username, JWT + bcrypt hashed passwords, a "keep me signed in" option (30 days vs 12 hours) and optional Google sign-in
- **Stamp Discovery**: Browse and search stamps with combined filters — free text (name, person, theme, story), country, exact year, decade, year range, category, theme and series
- **Two-Axis Classification**: every stamp has a `category` (what kind of issue it is) and a `theme` (what it is about), so "a Sports stamp about Space" is expressible
- **Country Explorer**: browse every country with its flag, ISO codes, region, stamp count, first issue year, theme breakdown and year-by-year timeline
- **Timeline**: stamps grouped by era and year across the whole catalogue
- **Personal Collection**: Add/remove stamps to/from personal collection, filter it by category and theme, view collection statistics
- **Community**: Create posts with optional stamp attachments, like/comment/save posts
- **Following**: Follow/unfollow other users, view follower/following lists. Backed by a dedicated `Follow` collection with a unique index, so counts can never drift out of sync with reality
- **Profile Management**: Edit profile information, display earned achievements
- **Private Profiles**: Mark your profile private so only approved followers can see your collection and posts
- **Notifications**: Receive notifications for likes, comments, follows, and achievements; each one links straight to the post or profile it refers to; mark read individually or all at once
- **Notification Preferences**: Turn off likes, comments, follows and/or achievement alerts individually
- **Achievements**: Earn badges for collecting milestones, stored in `UserAchievement` with the date earned
- **Account Security**: Change your password from Settings, with live strength rules; failed sign-ins are rate limited
- **Collector Interests**: Pick your interests and the Home page suggests catalogue stamps you do not own yet, matched on category, theme and era

### Collection Intelligence
- **Collection Gaps**: see exactly which stamps are missing, grouped by country and by series, with completion percentages, so you always know what to hunt for next
- **Stamp Passport**: per-country progress through the catalogue, with category coverage bars, top themes, date span and series completed, sorted least-complete first

### Admin Features
- **Dashboard**: View total users, stamps, posts, and collections statistics
- **User Management**: View all users, activate/deactivate accounts
- **Stamp Management**: Add, edit, and delete stamps from the catalogue, pick a series, and upload the stamp image as a base64 data URL
- **Post Management**: View all posts, delete inappropriate content

### Public Pages
- **Landing Page**: Attractive hero section, featured stamps, category grid, "Why Philately?" section
- **Explore**: Full filter panel (search, country, exact year, decade, from/to year, category, theme, series, sort) plus category tiles. `year` and `series` arrive as URL params from Country Detail, Timeline, Collection Gaps and stamp detail, and appear as dismissible chips
- **Countries / Country Detail**: Country Explorer grid and a per-country page with timeline and theme breakdown
- **Timeline**: Era summary cards, jump-to-year rail, and stamps in date order
- **Stamp Detail**: Full stamp information with historical story, design note, depicted person, series and the image's attribution

---

## Technology Stack

### Frontend
- **React.js** with React Router for navigation
- **Vite** for fast development server and builds
- **Tailwind CSS** for styling with postal-themed color palette
- **Axios** for API calls
- Custom components: Navbar, Footer, StampCard, StampArt, StampImage, PostCard, CommentSection, ProfileHeader, CollectionGrid, SearchBar, CategoryCard, NotificationItem, AchievementBadge, LoadingSpinner, Modal

### Stamp Images
- Every catalogue entry is a **real stamp scan** downloaded from Wikimedia Commons, stored under `server/public/stamps/` and served read-only at `/api/stamps/files/<file>`.
- Each entry carries its attribution: `sourceUrl` (the Commons page), `credit` (designer/issuer), `license` and `licenseUrl`, shown in the Stamp Detail attribution block and in the admin table.
- The catalogue itself is curated data, not search output: `server/data/stamp-manifest.json` pins the exact Commons file per stamp plus its category, theme, series, year and hand-written story; `server/scripts/fetch-stamps.js` resolves those pins, downloads the images and writes `server/data/stamps.json`, which is what `npm run seed` loads.
- Useful modes: `node scripts/fetch-stamps.js fetch` (download + write), `validate` (invariant checks), `review` (contact sheet at `public/stamp-review.html`), `search <q>` / `cat <category>` / `meta <File:...>` (Commons inspection). Re-running `fetch` resumes - finished entries come from disk and need no API calls.
- Wikimedia rate-limits hard (HTTP 429 with a 10-minute hint), so `fetch` backs off and skips; just run it again for the stragglers.
- `StampArt.jsx` still generates the deterministic engraved SVG for a stamp with no image, so a catalogue entry never renders as a broken box. Artwork is derived from a hash of the stamp's name and year: a given stamp always renders identically and different stamps look different.
- Run `npm run preview` in `server/` to regenerate `stamp-preview.html`, a contact sheet of every seeded stamp with its real image.

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- Custom models: User, Stamp, Country, Series, Collection, Post, Comment, Notification, Achievement, Follow, UserAchievement
- `server/utils/taxonomy.js` is the single source of truth for the 7 categories, 8 themes, regions and sort options; both server validation and client filter dropdowns mirror it

---

## Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

```bash
cd national-philately/server
npm install
# Create .env file with:
# PORT=5000
# MONGO_URI=mongodb://127.0.0.1:27017/national_philately
# JWT_SECRET=national_philately_jwt_secret_key_2024
#
# Optional - Google sign-in. Leave these out and the Google button simply
# never appears; everything else works unchanged.
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
# CLIENT_URL=http://localhost:5173

# Start server
npm run dev  # uses nodemon
# Or: npm start
```

### Frontend Setup

```bash
cd national-philately/client
npm install
# Start client
npm run dev
# App runs at http://localhost:5173 (port 3000 is commonly taken by other tools)
# API proxies to http://localhost:5000/api
```

> Note: the dev server is pinned to port **5173** with `strictPort`, so startup fails
> loudly instead of silently moving to another port.

### Database Setup
1. Ensure MongoDB is running
2. The backend connects to `mongodb://127.0.0.1:27017/national_philately`
3. Or set `MONGO_URI` in `.env` to your MongoDB Atlas connection string

### Seed Data

```bash
cd national-philately/server
npm run seed
```

This inserts:
- **12 real countries** with ISO-2/ISO-3 codes, flags, regions, currency and first issue years
- **7 stamp series** linked to countries, each with category, theme and issue dates
- **59 real stamps** from 12 countries, spread across all 7 categories and all 8 themes - each with its Wikimedia Commons image, attribution and hand-written story (`server/data/stamps.json`)
- 6 users (1 admin + 5 demo collectors)
- 26 collection items linking users to stamps
- 10 sample posts with likes and comments
- 10 achievements
- 18 earned badge records in `UserAchievement`, with staggered `earnedAt` dates
- Sample notifications
- 10 follow edges in `Follow` (not everyone follows everyone)

### Verifying the install

Automated test scripts are included and can be re-run at any time (the backend
must be running on port 5000 first):

```bash
cd national-philately/server
npm test              # seeds a clean database, then runs 249 end-to-end API checks
npm run test:svg      # renders StampArt for real and asserts the SVG output
npm run preview       # regenerates stamp-preview.html from live seed data
```

`stamp-preview.html` in the project root is a static contact sheet of all 59
stamps with their real images — open it in a browser to review the catalogue
without running the app.

---

## Demo Credentials

| Role | Email | Username | Password |
|------|-------|----------|----------|
| **Admin** | admin@philately.com | `admin` | admin123 |
| **User** | user@philately.com | `arjun` | user123 |

Sign in with either column — the login form accepts both.

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Sign in with `{ email | username, password, remember }`;
  `remember: true` issues a 30-day token, `false` a 12-hour one. Failed attempts
  are throttled per IP + identifier (10 per 15 minutes).
- `GET /api/auth/me` - Get current user (protected)
- `GET /api/auth/providers` - Which optional sign-in methods are configured, e.g. `{ "google": false }`
- `GET /api/auth/google` - Starts Google OAuth (503 with a clear message when not configured)
- `GET /api/auth/google/callback` - OAuth callback; redirects to `/auth/callback?token=...` or `/login?error=...`

### Pagination
List endpoints accept an **optional** `?page=` and/or `?limit=`. Without either
parameter the response is the full array, exactly as before. With either
parameter the body is the requested window and the totals are published as
headers: `X-Total-Count`, `X-Page`, `X-Limit`, `X-Total-Pages` (limit is capped
at 60). This keeps existing callers working while letting the client show
"Load more" controls.

### Stamps
- `GET /api/stamps` - Get stamps with any combination of:
  `search`, `country` (name or ISO-2), `year`, `decade`, `fromYear`, `toYear`, `category`, `theme`, `series`, `sort` (`newest`/`oldest`/`popular`/`az`), `countOnly`
- `GET /api/stamps/facets` - Distinct categories, themes and years for building filter UI
- `GET /api/stamps/:id` - Get single stamp
- `POST /api/stamps` - Add stamp (admin only)
- `PUT /api/stamps/:id` - Edit stamp (admin only)
- `DELETE /api/stamps/:id` - Delete stamp (admin only)
- `POST /api/stamps/upload` - Store an image sent as a base64 data URL and return its `/api/stamps/files/...` url (admin only; PNG/JPEG/WebP/GIF, 4MB max, magic-byte checked)
- `GET /api/stamps/files/:file` - Read-only static serving of the image files

Invalid `category`/`theme` values are rejected with `400` and a message listing the allowed values.

### Countries
- `GET /api/countries` - All countries with stamp counts
- `GET /api/countries/regions` - Distinct region names
- `GET /api/countries/:idOrCode` - Country detail with stamp count, theme breakdown, year-by-year timeline and stamps
- `POST /api/countries`, `PUT /api/countries/:id`, `DELETE /api/countries/:id` - Admin only; delete is blocked while stamps reference the country

### Series
- `GET /api/series` - All series, filterable by `country`, `category`, `theme`, `search`
- `GET /api/series/:id` - Series detail with its stamps
- `POST /api/series`, `PUT /api/series/:id`, `DELETE /api/series/:id` - Admin only; delete is blocked while stamps reference the series

### Collection
- `GET /api/collection` - Get user's collection
- `POST /api/collection` - Add stamp to collection
- `DELETE /api/collection/:stampId` - Remove from collection

### Posts
- `GET /api/posts` - Get the feed (public; private collectors' posts are hidden unless you follow them)
- `GET /api/posts/:id` - Get a single post, used when a notification links to one
- `GET /api/posts/saved` - Get posts saved by current user (protected)
- `POST /api/posts` - Create post (authenticated)
- `DELETE /api/posts/:id` - Delete post (owner or admin); its comments and notifications go with it
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/save` - Save/unsave post

### Comments
- `GET /api/posts/:id/comments` - Get comments for post
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/posts/comments/:id` - Delete comment (owner or admin)

### Users
- `GET /api/users/me` - Own profile with counts, earned badges, follower/following lists (protected)
- `GET /api/users/:username` - Public profile; includes `canView` so the UI can hide content
- `GET /api/users/:username/collection` - A user's collection (403 if their profile is private and you don't follow them)
- `GET /api/users/:username/posts` - A user's posts, same privacy rule
- `GET /api/users/:username/followers` - People who follow this user
- `GET /api/users/:username/following` - People this user follows
- `PUT /api/users/profile` - Update name, bio, profile image, interests
- `POST /api/users/:id/follow` - Follow/unfollow toggle; returns `{ following, followerCount, followingCount }`

### Account Settings
All protected, and all declared before `/users/:username` so `settings` is never read as a username.
- `GET /api/users/settings` - Current interests, privacy and notification preferences
- `PUT /api/users/settings/change-password` - `{ currentPassword, newPassword }`; verifies the old one with bcrypt
- `PUT /api/users/settings/privacy` - `{ isPrivate }`; private profiles hide collection and posts from non-followers
- `PUT /api/users/settings/notifications` - Any subset of `notifyLikes`, `notifyComments`, `notifyFollows`, `notifyAchievements`

### Collection Intelligence
- `GET /api/collection/gaps` - What is missing, grouped by country and by series, each with percent complete. Derived live from the catalogue, so it can never go stale.
- `GET /api/collection/passport` - Per-country progress: percent owned, category coverage, top themes, date span, series held. Sorted least-complete first so the next country to collect is at the top.

### Notifications
- `GET /api/notifications` - Get user notifications (each carries a `link` to the post or profile)
- `GET /api/notifications/unread-count` - Cheap `{ count }` for the navbar badge
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

### Admin
- `GET /api/admin/stats` - Dashboard statistics (admin only)
- `GET /api/admin/users` - List all users (admin only)
- `PUT /api/admin/users/:id/toggle` - Toggle user active status (admin only)
- `GET /api/admin/posts` - List all posts (admin only)
- `DELETE /api/admin/posts/:id` - Delete post (admin only)
- `GET /api/admin/stamps` - List all stamps for management (admin only)
- `DELETE /api/admin/stamps/:id` - Delete stamp (admin only)

---

## Project Structure

```
national-philately/
  client/
    src/
      components/        # Reusable UI components
        AchievementBadge.jsx
        CategoryCard.jsx
        CollectionGrid.jsx
        CommentSection.jsx
        Footer.jsx
        LoadingSpinner.jsx
        LoadMore.jsx       # "Load more" control for paginated lists
        Modal.jsx
        Navbar.jsx
        NotificationItem.jsx
        PostCard.jsx
        ProfileHeader.jsx
        ProtectedRoute.jsx # Sends signed-out visitors to /login with a return path
        SearchBar.jsx
        StampArt.jsx      # Generated SVG postage stamp artwork
        StampCard.jsx
        StampImage.jsx    # Real image if present, else StampArt
      context/           # React context (Auth + unread count + owned stamp ids)
        AuthContext.jsx
      hooks/
        usePagedList.js   # Page-by-page fetching with "Load more"
      pages/             # Page components
        Admin.jsx
        AdminPosts.jsx
        AdminStamps.jsx
        AdminUsers.jsx
        AuthCallback.jsx    # Landing page for the Google sign-in redirect
        Collection.jsx
        CollectionGaps.jsx  # What is missing from your collection
        Community.jsx
        Countries.jsx
        CountryDetail.jsx
        CreatePost.jsx
        Home.jsx
        Landing.jsx
        Login.jsx
        Notifications.jsx
        Passport.jsx        # Per-country collection progress
        Profile.jsx
        Register.jsx
        SavedPosts.jsx
        Settings.jsx
        Explore.jsx
        StampDetail.jsx
        Timeline.jsx
      services/          # API services
        api.js
      utils/
        recommend.js      # Interest-to-catalogue matching for Home
        stamp.js
      App.jsx            # Main app with routing
      index.css          # Global styles with Tailwind
    index.html
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
  server/
    controllers/       # Request handlers
      adminController.js
      authController.js
      collectionController.js
      countryController.js
      notificationController.js
      postController.js
      seriesController.js
      stampController.js
      userController.js
    models/            # Mongoose models
      Achievement.js
      Collection.js
      Comment.js
      Country.js
      Follow.js         # One document per "A follows B" edge
      Notification.js
      Post.js
      Series.js
      Stamp.js
      User.js
      UserAchievement.js# One document per earned badge, with earnedAt
    routes/            # Express routes
      adminRoutes.js
      authRoutes.js
      collectionRoutes.js
      countryRoutes.js
      postRoutes.js
      seriesRoutes.js
      stampRoutes.js
      userRoutes.js
      notificationRoutes.js
    middleware/        # Custom middleware
      auth.js
      rateLimit.js     # In-memory sign-in throttling
    config/            # Configuration
      db.js
    utils/             # Utility functions
      achievements.js
      pagination.js    # Optional ?page/?limit paging with total headers
      taxonomy.js      # Categories, themes, regions, sort options
    data/               # Curated catalogue, generated by scripts/fetch-stamps.js
      stamp-manifest.json # Pinned Commons file + prose per stamp (source of truth)
      stamps.json         # Resolved catalogue that seed.js inserts
    scripts/
      fetch-stamps.js   # fetch / validate / review / search / cat / meta modes
    public/
      stamps/           # Downloaded stamp images, served at /api/stamps/files
    seed.js            # Seed data script
    e2e-test.js        # End-to-end API test suite (249 checks)
    svg-render-test.js # Renders StampArt and asserts SVG output
    generate-preview.js# Regenerates the stamp-preview.html contact sheet
    server.js          # Main entry point
  stamp-preview.html   # Static contact sheet of all 59 stamps
  README.md
```

---

## Design

- **Color Palette**: Inspired by paper, postal red, deep blue, and warm cream
- **Typography**: Inter for UI, Playfair Display for headings
- **Visual Style**: Modern, clean, youthful - not old postal website style
- **Components**: Rounded cards, clean typography, subtle animations, hover effects, good spacing
- **Responsive**: Works on desktop, tablet, and mobile with compact bottom navigation on mobile

---

## Key Implementation Highlights

### Authentication
- JWT tokens stored in `localStorage`
- Sign in with an email address **or** a username, case-insensitively
- "Keep me signed in" issues a 30-day token; otherwise the token lasts 12 hours
- Optional Google OAuth implemented directly against Google's endpoints (no extra dependency). Accounts are matched by Google id first, then by email, so signing in with Google does not create a duplicate. If the client id/secret are absent, `/auth/providers` says so and the client hides the button.
- Failed sign-ins are throttled per IP + identifier (10 per 15 minutes), and a successful sign-in clears the counter
- `protect` middleware validates tokens on protected routes
- `optionalAuth` lets public endpoints tailor their answer to a signed-in viewer (e.g. showing a followed private collector's posts)
- `adminOnly` middleware restricts admin routes
- Passwords hashed with bcrypt (10 salt rounds)
- Passwords never returned from API responses

### Achievement System
- 10 achievements: First Stamp, First Post, 10/50/100 Stamps, Community Contributor, History Explorer, Wildlife Collector, International Collector, First Series
- Rules are pure functions over a context object of raw counts, so a rule can't silently bind to the wrong argument
- Earned badges live in `UserAchievement`, keyed `(user, achievement)` unique, so a badge cannot be granted twice even under concurrent requests
- Unlocking a badge optionally raises a notification, respecting the user's preference
- Displayed on the user's profile

### Notification System
- Types: like, comment, follow, achievement
- Every notification carries the `link` it refers to, so the list is actionable rather than a dead log. A post link opens `/community?post=<id>`, which fetches that post directly and shows it highlighted even if it is not on the first page of the feed.
- Every type is gated on the recipient's own preference, so opting out actually stops the notification
- Unread notifications shown with a red dot badge, powered by a dedicated `/notifications/unread-count` endpoint
- Mark as read individually or all at once

### Pagination
- List endpoints are paginated opt-in: no `page`/`limit` means "return everything", so nothing that used to work changed shape
- With paging, the body stays a plain array and the totals ride in `X-Total-Count` / `X-Total-Pages` headers
- `usePagedList` on the client wraps this into a "Load more" flow, used by Explore, Community and Notifications

### Deleting Content
- Deleting a post also deletes its comments and every notification whose link points at it, so no rows are left referencing a document that no longer exists
- Deleting a stamp also deletes collection rows that reference it; Collection Gaps and the Passport ignore any orphan ids that slip through

### Following System
- One `Follow` document per edge, with a unique `(follower, following)` index and a schema-level guard against self-following
- Follow counts are computed from the collection, so they cannot drift
- Triggered notifications respect the target's `notifyFollows` preference
- Profile shows authoritative follower/following counts and lists both sides

### Privacy
- A private profile hides the user's collection and posts from everyone except approved followers
- The profile endpoint returns `canView` so the UI knows before making requests it would be refused
- The owner always sees their own content

### Collection Management
- Users can add stamps to their collection
- Duplicate prevention (unique index on user + stamp)
- Can remove stamps from collection
- Collection statistics displayed on profile
- **Collection Gaps** and **Stamp Passport** are computed on request from the user's collection plus the live catalogue, never stored, so they are always correct after any edit

### Admin Authorization
- All admin routes protected with `protect` + `adminOnly` middleware
- Safe operations: cannot deactivate admin users
- Statistics dashboard with total counts

---

## Phase Build Order (as specified)

1. ✅ Create React + Express project
2. ✅ Connect MongoDB
3. ✅ Create models
4. ✅ Create authentication
5. ✅ Build Navbar/layout
6. ✅ Build landing page
7. ✅ Build stamp catalogue
8. ✅ Build stamp details
9. ✅ Build collection
10. ✅ Build community
11. ✅ Build posts
12. ✅ Build comments/likes
13. ✅ Build profiles/following
14. ✅ Build notifications
15. ✅ Build achievements
16. ✅ Build admin dashboard
17. ✅ Add seed data
18. ✅ Make responsive
19. ✅ Test everything — `e2e-test.js` (249 API checks) and `svg-render-test.js` both pass
20. ✅ Catalogue overhaul — `Country` + `Series` models, two-axis category/theme, advanced combined filters, Country Explorer and Timeline pages
21. ✅ Normalised the social graph — follows in `Follow`, earned badges in `UserAchievement`, with unique indexes instead of embedded arrays
22. ✅ Account settings — change password, private profiles, per-event notification preferences, collector interests
23. ✅ Collection intelligence — Collection Gaps and Stamp Passport pages built on the country/series catalogue
24. ✅ Real-stamp catalogue — 59 curated Wikimedia Commons entries pinned in `stamp-manifest.json`, downloaded by `scripts/fetch-stamps.js`, with attribution and hand-written stories
25. ✅ Admin image upload — `POST /api/stamps/upload` stores a base64 data URL as a file served read-only from `/api/stamps/files`
26. ✅ Catalogue-proof tests — e2e derives its expected counts from `data/stamps.json` and checks every image over HTTP
27. ✅ Privacy and cleanup — the community feed now applies the same private-profile rule as the profile page, and deletes cascade to comments, notifications and collection rows
28. ✅ Sign-in options — email or username, remember me, optional Google OAuth, and rate limiting; optional pagination and actionable notifications across the app

---

## Screenshots (Described)

- **Landing**: Hero with "Discover the stories behind every stamp" subtitle, stamp collage, 6 featured stamp cards, category grid (Historical, Commemorative, Definitive, Cultural, Sports, Science, Wildlife), "Why National Philately?" section with Discover/Collect/Connect pillars
- **Home**: Greeting "Good morning, [Name] 👋", stat tiles, Continue Exploring with 4 stamp cards, **Recommended for you** built from the collector's interests (with an invitation to pick some if they have none), Trending in the Community with 2 posts, Your Collection count, Recent Achievements displayed
- **Explore**: Search bar, filter panel (country, exact year, decade, from/to year, category, theme, series) plus a sort selector, deep-link chips for a year or series passed in from elsewhere, clickable category tiles with live counts, results grid and empty state
- **Collection Gaps**: overall progress bar, a By-Series / By-Country tab, and per-entry progress with each missing stamp listed and linked straight to its detail page
- **Stamp Passport**: five summary tiles, then a per-country card with an SVG progress ring, "Complete" badge, category coverage bars, theme chips and holdings date span
- **Countries**: Searchable, region-filterable grid of country cards grouped by region, each showing flag, ISO codes, currency, stamp count and first issue year
- **Country Detail**: Flag and description header, stamp/theme/first-issue stats, popular-theme chips, an interactive year-by-year timeline, and the country's stamps
- **Timeline**: Four era summary cards, a jump-to-year chip rail with counts, and the stamps for the selected year
- **Stamp Detail**: Large stamp image, name, country/year, category + theme + series chips, denomination, description, design note, depicted person, historical story, an attribution line for the image (source, designer, licence), "+ Add to Collection" / "✓ In your collection" toggle, Related Stamps section
- **Community**: Instagram/Pinterest-inspired feed with posts showing user profile picture, content, date, likes, comments, Post actions (Like, Comment, Save). Shows "Latest" and "Most Liked", loads more on demand, and a `?post=<id>` link from a notification opens that post highlighted at the top.
- **Login**: Email-or-username field, "Keep me signed in" toggle (30 days vs this session), and a Google button that only appears when the server is configured for it. After signing in the visitor is returned to the page they originally asked for.
- **Profile**: Avatar with username, display name, bio, stamp count, post count, follower/following counts, Follow/Unfollow button, Achievements grid, Collection grid, Posts grid, Edit Profile link. A private profile replaces the grids with a "This profile is private — Follow @user to see their collection and posts" panel, and following it reveals the content immediately without a refresh
- **Settings**: Five cards — Profile, Interests (multi-select chips), Privacy (private toggle), Notifications (per-event checkboxes), Change Password (with live strength checklist and match confirmation)
- **Admin Dashboard**: Cards showing Total Users/Stamps/Posts/Collections, Manage Users/Stamps/Posts sections
- **Navbar**: Mobile-responsive, shows Login/Join Free when unauthenticated, shows Home/Community/Collection/Notifications/Admin when authenticated
- **Footer**: Links to Explore, Countries, Timeline, Community, Join Free, Categories (Historical, Commemorative, Definitive, Cultural, Sports, Science, Wildlife)

---

## Notes for Viva/Defense

This is a **college FSD project**, not a production application. Key points to explain:

1. **Architecture**: MERN stack with JWT auth, MVC-ish structure using controllers/models/routes
2. **Database Design**: 11 Mongoose models with proper relationships (user→collection→stamp, user→posts, posts→comments, follower→follow→following, user→earned badge)
3. **Security**: bcrypt password hashing, JWT stateless authentication, role-based access control, sign-in rate limiting, and private-profile enforcement on every endpoint that exposes a user's content
4. **Features Implemented**: All 30 requirements from the project brief are addressed
5. **Trade-offs**: Kept simple implementation over enterprise features (no microservices, no Docker, no WebSockets, no AI)
6. **Scalability**: MongoDB schema designed for easy extension, admin routes structured for future growth
7. **Code Understanding**: Every endpoint, model, and component can be explained and demonstrated

---

## Future Enhancements (Beyond Scope)

- Image upload for posts (Cloudinary/Supabase)
- Real-time comments via WebSockets
- Advanced search with Elasticsearch
- User ranking/XP system
- Philately blog/news section
- Stamp trading/marketplace
- Mobile app via React Native
- CMS for admin content management

---

Built with ❤️ as a College FSD Project