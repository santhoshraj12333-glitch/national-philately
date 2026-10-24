import AchievementBadge from './AchievementBadge'

export default function ProfileHeader({ profile, isSelf, onFollow, following, busy }) {
  const stats = [
    { label: 'Stamps', value: profile.collectionCount ?? 0 },
    { label: 'Posts', value: profile.postCount ?? 0 },
    { label: 'Followers', value: profile.followerCount ?? 0 },
    { label: 'Following', value: profile.followingCount ?? 0 },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        {profile.profileImage ? (
          <img
            src={profile.profileImage}
            alt={profile.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-postal-cream"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-postal-blue text-white flex items-center justify-center font-display text-3xl font-bold">
            {profile.name?.[0] || '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-gray-800">{profile.name}</h1>
          <p className="text-postal-red font-medium text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-gray-500 text-sm mt-2">{profile.bio}</p>}

          {!isSelf && (
            <button
              onClick={onFollow}
              disabled={busy}
              className={`mt-4 px-5 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50 ${
                following
                  ? 'bg-white border border-postal-red text-postal-red hover:bg-red-50'
                  : 'bg-postal-red text-white hover:bg-red-700'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-2xl font-bold text-postal-blue">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {profile.achievements?.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="font-semibold text-postal-blue text-sm mb-3">Achievements</h3>
          <div className="flex flex-wrap gap-4">
            {profile.achievements.map((a) => (
              <AchievementBadge key={a._id} achievement={a} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}