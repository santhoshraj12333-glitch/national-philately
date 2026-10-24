import StampArt from './StampArt'

/**
 * Renders a real photo when the stamp/post has an image URL,
 * otherwise renders generated SVG stamp artwork.
 */
export default function StampImage({ stamp, className = '', alt }) {
  const url = stamp?.image

  if (url) {
    return <img src={url} alt={alt || stamp?.name || 'Stamp'} className={className} loading="lazy" />
  }

  return <StampArt stamp={stamp} className={className} />
}