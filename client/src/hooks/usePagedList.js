import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

/**
 * Fetches a list endpoint one page at a time.
 *
 * The endpoints answer with a plain array and publish the totals in the
 * X-Total-Count / X-Total-Pages headers, so the shape of the data never
 * changes - only how much of it arrives.
 */
export function usePagedList(path, { limit = 12, enabled = true, reloadKey = 0 } = {}) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (targetPage, append) => {
      setLoading(true)
      setError('')
      try {
        const separator = path.includes('?') ? '&' : '?'
        const { data, headers } = await api.get(
          `${path}${separator}page=${targetPage}&limit=${limit}`
        )
        setItems((prev) => (append ? [...prev, ...data] : data))
        setTotal(Number(headers['x-total-count'] ?? data.length))
        setPage(targetPage)
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this list.')
      } finally {
        setLoading(false)
      }
    },
    [path, limit]
  )

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    load(1, false)
  }, [enabled, reloadKey, load])

  const loadMore = () => {
    if (loading) return
    load(page + 1, true)
  }

  /** Applies a change to the loaded items without asking the server again. */
  const mutate = useCallback((fn) => setItems((prev) => fn(prev)), [])

  return {
    items,
    total,
    page,
    loading,
    error,
    loadMore,
    hasMore: items.length < total,
    mutate,
    reload: () => load(1, false),
  }
}
