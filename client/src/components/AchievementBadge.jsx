export default function AchievementBadge({ achievement, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  }

  return (
    <div className="flex flex-col items-center gap-1" title={`${achievement.name}: ${achievement.description}`}>
      <div className={`${sizeClasses[size]} bg-postal-cream rounded-full flex items-center justify-center border-2 border-postal-gold/30 shadow-sm`}>
        {achievement.icon}
      </div>
      <span className="text-xs text-gray-600 font-medium text-center leading-tight max-w-[80px]">{achievement.name}</span>
    </div>
  )
}
