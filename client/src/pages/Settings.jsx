import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { INTERESTS } from '../constants'

const PASSWORD_RULES = [
  { label: 'At least 6 characters', test: (v) => v.length >= 6 },
  { label: 'Contains a number', test: (v) => /\d/.test(v) },
  { label: 'Contains a letter', test: (v) => /[a-zA-Z]/.test(v) },
]

const NOTIFICATIONS = [
  { key: 'notifyLikes', label: 'Likes', hint: 'When someone likes one of your posts' },
  { key: 'notifyComments', label: 'Comments', hint: 'When someone comments on your posts' },
  { key: 'notifyFollows', label: 'New followers', hint: 'When someone starts following you' },
  { key: 'notifyAchievements', label: 'Achievements', hint: 'When you unlock a new badge' },
]

const Card = ({ title, description, children }) => (
  <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7">
    <h2 className="font-display text-lg font-bold text-postal-blue">{title}</h2>
    {description && <p className="text-sm text-gray-500 mt-1 mb-5">{description}</p>}
    <div className={description ? '' : 'mt-5'}>{children}</div>
  </section>
)

export default function Settings() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')

  const [interests, setInterests] = useState([])
  const [notify, setNotify] = useState({
    notifyLikes: true,
    notifyComments: true,
    notifyFollows: true,
    notifyAchievements: true,
  })
  const [isPrivate, setIsPrivate] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setBio(user?.bio || '')
    setProfileImage(user?.profileImage || '')
  }, [user])

  // Notification/privacy preferences live on the user doc but are only exposed
  // by /users/settings, so they are fetched rather than read off the token user.
  useEffect(() => {
    let active = true
    api
      .get('/users/settings')
      .then(({ data }) => {
        if (!active) return
        setInterests(data.interests || [])
        setIsPrivate(!!data.isPrivate)
        setNotify({
          notifyLikes: data.notifyLikes,
          notifyComments: data.notifyComments,
          notifyFollows: data.notifyFollows,
          notifyAchievements: data.notifyAchievements,
        })
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      active = false
    }
  }, [])

  const run = async (key, work, okMessage) => {
    setBusy(key)
    setError('')
    setSuccess('')
    try {
      await work()
      setSuccess(okMessage)
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
    setBusy('')
  }

  const saveProfile = () =>
    run('profile', async () => {
      const { data } = await api.put('/users/profile', { name, bio, profileImage })
      setName(data.name)
      setBio(data.bio)
      setProfileImage(data.profileImage)
      updateUser(data)
    }, 'Profile updated.')

  const saveInterests = () =>
    run('interests', async () => {
      const { data } = await api.put('/users/profile', { interests })
      updateUser(data)
    }, 'Interests saved.')

  const savePrivacy = () =>
    run('privacy', async () => {
      const { data } = await api.put('/users/settings/privacy', { isPrivate })
      setIsPrivate(data.isPrivate)
    }, 'Privacy setting saved.')

  const saveNotifications = () =>
    run('notifications', async () => {
      const { data } = await api.put('/users/settings/notifications', notify)
      setNotify(data)
    }, 'Notification preferences saved.')

  const changePassword = () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }
    return run(
      'password',
      async () => {
        await api.put('/users/settings/change-password', { currentPassword, newPassword })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      },
      'Password changed. You can keep using this session.'
    )
  }

  const toggleInterest = (value) =>
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    )

  const passwordChecks = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(newPassword) }))
  const passwordStrong = passwordChecks.every((c) => c.ok)

  const input =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-postal-red transition'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-postal-blue">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile, what you collect, and how the app contacts you.
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}

      <Card title="Profile" description="This is what other collectors see.">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              className={`${input} resize-none`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Image URL</label>
            <input
              type="text"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://..."
              className={input}
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={busy === 'profile'}
            className="bg-postal-red text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {busy === 'profile' ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </Card>

      <Card
        title="Interests"
        description="Pick the subjects you care about. Used to recommend stamps you haven't collected yet."
      >
        <div className="flex flex-wrap gap-2 mb-5">
          {INTERESTS.map((item) => {
            const active = interests.includes(item)
            return (
              <button
                key={item}
                onClick={() => toggleInterest(item)}
                className={`px-3.5 py-2 rounded-full text-sm font-medium transition border ${
                  active
                    ? 'bg-postal-blue text-white border-postal-blue'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-postal-blue'
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mb-3">{interests.length} selected</p>
        <button
          onClick={saveInterests}
          disabled={busy === 'interests'}
          className="bg-postal-red text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {busy === 'interests' ? 'Saving...' : 'Save Interests'}
        </button>
      </Card>

      <Card title="Privacy" description="Control who can see your collection and posts.">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-1 w-4 h-4 accent-postal-red"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-700">Private profile</span>
            <span className="block text-sm text-gray-500">
              Your collection and posts are visible only to people you approve by following them.
            </span>
          </span>
        </label>
        <button
          onClick={savePrivacy}
          disabled={busy === 'privacy'}
          className="mt-5 bg-postal-red text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {busy === 'privacy' ? 'Saving...' : 'Save Privacy'}
        </button>
      </Card>

      <Card title="Notifications" description="Choose which events create an in-app notification.">
        <div className="space-y-3">
          {NOTIFICATIONS.map(({ key, label, hint }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!notify[key]}
                onChange={(e) => setNotify((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="w-4 h-4 accent-postal-red"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">{label}</span>
                <span className="block text-xs text-gray-400">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={saveNotifications}
          disabled={busy === 'notifications'}
          className="mt-5 bg-postal-red text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
        >
          {busy === 'notifications' ? 'Saving...' : 'Save Notifications'}
        </button>
      </Card>

      <Card title="Change Password" description="You stay signed in on this device after changing it.">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={input}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={input}
              autoComplete="new-password"
            />
            <ul className="mt-2 space-y-1">
              {passwordChecks.map((c) => (
                <li
                  key={c.label}
                  className={`text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {c.ok ? '✓' : '○'} {c.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${input} ${confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : ''}`}
              autoComplete="new-password"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
            )}
          </div>
          <button
            onClick={changePassword}
            disabled={busy === 'password' || !passwordStrong || !currentPassword}
            className="bg-postal-blue text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50"
          >
            {busy === 'password' ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </Card>

      <button
        onClick={() => navigate('/profile')}
        className="text-sm text-gray-500 hover:text-postal-blue font-medium"
      >
        ← Back to profile
      </button>
    </div>
  )
}