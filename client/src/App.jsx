import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Countries from './pages/Countries'
import CountryDetail from './pages/CountryDetail'
import Timeline from './pages/Timeline'
import StampDetail from './pages/StampDetail'
import Collection from './pages/Collection'
import Community from './pages/Community'
import SavedPosts from './pages/SavedPosts'
import CreatePost from './pages/CreatePost'
import Profile from './pages/Profile'
import CollectionGaps from './pages/CollectionGaps'
import Passport from './pages/Passport'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import AdminUsers from './pages/AdminUsers'
import AdminStamps from './pages/AdminStamps'
import AdminPosts from './pages/AdminPosts'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <span className="text-5xl block mb-4">📭</span>
      <h1 className="font-display text-3xl font-bold text-postal-blue">Page not found</h1>
      <p className="text-gray-500 mt-2">This page slipped out of the mailbox.</p>
      <a
        href="/"
        className="inline-block mt-6 bg-postal-red text-white px-6 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
      >
        Back to Home
      </a>
    </div>
  )
}

function App() {
  const { loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/countries" element={<Countries />} />
          <Route path="/countries/:iso2" element={<CountryDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/stamp/:id" element={<StampDetail />} />
          <Route
            path="/home"
            element={<ProtectedRoute><Home /></ProtectedRoute>}
          />
          <Route
            path="/collection"
            element={<ProtectedRoute><Collection /></ProtectedRoute>}
          />
          <Route
            path="/collection/gaps"
            element={<ProtectedRoute><CollectionGaps /></ProtectedRoute>}
          />
          <Route
            path="/collection/passport"
            element={<ProtectedRoute><Passport /></ProtectedRoute>}
          />
          <Route
            path="/community"
            element={<ProtectedRoute><Community /></ProtectedRoute>}
          />
          <Route
            path="/community/saved"
            element={<ProtectedRoute><SavedPosts /></ProtectedRoute>}
          />
          <Route
            path="/community/create"
            element={<ProtectedRoute><CreatePost /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
          <Route
            path="/profile/:username"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><Notifications /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><Settings /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>}
          />
          <Route
            path="/admin/users"
            element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>}
          />
          <Route
            path="/admin/stamps"
            element={<ProtectedRoute adminOnly><AdminStamps /></ProtectedRoute>}
          />
          <Route
            path="/admin/posts"
            element={<ProtectedRoute adminOnly><AdminPosts /></ProtectedRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
