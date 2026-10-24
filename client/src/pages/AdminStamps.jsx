import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Modal from '../components/Modal'
import StampImage from '../components/StampImage'
import LoadingSpinner from '../components/LoadingSpinner'
import { CATEGORY_NAMES, THEME_NAMES } from '../constants'
import { countryName, countryYearLabel } from '../utils/stamp'

const EMPTY = {
  name: '',
  country: '',
  year: '',
  category: CATEGORY_NAMES[0],
  theme: THEME_NAMES[0],
  series: '',
  seriesNumber: '',
  denomination: '',
  person: '',
  description: '',
  story: '',
  designNote: '',
  image: '',
  credit: '',
  license: '',
}

export default function AdminStamps() {
  const [stamps, setStamps] = useState([])
  const [countries, setCountries] = useState([])
  const [seriesList, setSeriesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/admin/stamps')
      .then(({ data }) => active && setStamps(data))
      .catch(() => active && setError('Could not load stamps'))
      .finally(() => active && setLoading(false))
    api
      .get('/countries')
      .then(({ data }) => active && setCountries(data))
      .catch(() => {})
    api
      .get('/series')
      .then(({ data }) => active && setSeriesList(Array.isArray(data) ? data : data.series || []))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setForm({
      name: s.name || '',
      country: s.country?.iso2 || s.countryName || '',
      year: s.year || '',
      category: s.category || CATEGORY_NAMES[0],
      theme: s.theme || THEME_NAMES[0],
      series: s.series?._id || '',
      seriesNumber: s.seriesNumber ?? '',
      denomination: s.denomination || '',
      person: s.person || '',
      description: s.description || '',
      story: s.story || '',
      designNote: s.designNote || '',
      image: s.image || '',
      credit: s.credit || '',
      license: s.license || '',
    })
    setEditingId(s._id)
    setFormError('')
    setModalOpen(true)
  }

  const uploadImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setFormError('')
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read that file'))
        reader.readAsDataURL(file)
      })
      const { data } = await api.post('/stamps/upload', { image: dataUrl, name: form.name })
      setForm((prev) => ({ ...prev, image: data.image }))
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Could not upload image')
    }
    setUploading(false)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name || !form.country || !form.year || !form.category || !form.theme) {
      setFormError('Name, country, year, category and theme are all required.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        series: form.series || null,
        seriesNumber: form.seriesNumber === '' ? null : Number(form.seriesNumber),
      }
      if (editingId) {
        const { data } = await api.put(`/stamps/${editingId}`, payload)
        setStamps((prev) => prev.map((s) => (s._id === data._id ? data : s)))
      } else {
        const { data } = await api.post('/stamps', payload)
        setStamps((prev) => [data, ...prev])
      }
      setModalOpen(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save stamp')
    }
    setSaving(false)
  }

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? This also removes it from all collections.`)) return
    const snapshot = stamps
    setStamps((prev) => prev.filter((x) => x._id !== s._id))
    try {
      await api.delete(`/stamps/${s._id}`)
    } catch {
      setStamps(snapshot)
      setError('Could not delete stamp')
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  const filtered = stamps.filter((s) => {
    const q = search.toLowerCase()
    return (
      !search ||
      s.name?.toLowerCase().includes(q) ||
      s.person?.toLowerCase().includes(q) ||
      s.theme?.toLowerCase().includes(q) ||
      countryName(s).toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-sm text-gray-500 hover:text-postal-red transition">
        ← Admin Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 mb-6">
        <h1 className="font-display text-3xl font-bold text-postal-blue">Manage Stamps</h1>
        <button
          onClick={openCreate}
          className="bg-postal-red text-white px-5 py-2.5 rounded-full font-semibold hover:bg-red-700 transition"
        >
          + Add Stamp
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-4 text-sm">{error}</div>}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search stamps..."
        className="w-full sm:w-80 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-postal-red transition mb-5"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="aspect-[4/5] bg-[#EFE7D8] p-2">
              <StampImage stamp={s} className="w-full h-full object-contain" />
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="inline-block bg-postal-cream text-postal-blue text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {s.category}
                </span>
                {s.theme && (
                  <span className="inline-block bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {s.theme}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mt-2 truncate">{s.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {countryYearLabel(s)}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-full border border-postal-blue text-postal-blue hover:bg-blue-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(s)}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-full border border-postal-red text-postal-red hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
          No stamps found.
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Stamp' : 'Add Stamp'}>
        <form onSubmit={save} className="space-y-3">
          {formError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{formError}</div>}

          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Stamp name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            >
              <option value="">Country</option>
              {countries.map((c) => (
                <option key={c._id} value={c.iso2}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="Year"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            >
              {CATEGORY_NAMES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            >
              {THEME_NAMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.series}
              onChange={(e) => setForm({ ...form, series: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            >
              <option value="">No series</option>
              {seriesList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={form.seriesNumber}
              onChange={(e) => setForm({ ...form, seriesNumber: e.target.value })}
              placeholder="No."
              disabled={!form.series}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red disabled:bg-gray-50 disabled:text-gray-400"
            />
            <input
              type="text"
              value={form.denomination}
              onChange={(e) => setForm({ ...form, denomination: e.target.value })}
              placeholder="Denomination"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            />
          </div>

          <input
            type="text"
            value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })}
            placeholder="Person depicted (optional, improves search)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red resize-none"
          />
          <textarea
            value={form.story}
            onChange={(e) => setForm({ ...form, story: e.target.value })}
            placeholder="Historical story"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red resize-none"
          />
          <textarea
            value={form.designNote}
            onChange={(e) => setForm({ ...form, designNote: e.target.value })}
            placeholder="Design note — what the stamp depicts"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red resize-none"
          />
          <div className="border border-dashed border-gray-300 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-20 bg-[#EFE7D8] rounded overflow-hidden flex items-center justify-center shrink-0">
                {form.image ? (
                  <img src={form.image} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400 px-1 text-center">No image</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block">
                  <span className="inline-block text-xs font-semibold py-1.5 px-3 rounded-full border border-postal-blue text-postal-blue hover:bg-blue-50 transition cursor-pointer">
                    {uploading ? 'Uploading...' : 'Upload image'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={uploadImage}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="or paste an image URL"
                  className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-postal-red"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.credit}
              onChange={(e) => setForm({ ...form, credit: e.target.value })}
              placeholder="Image credit"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            />
            <input
              type="text"
              value={form.license}
              onChange={(e) => setForm({ ...form, license: e.target.value })}
              placeholder="Licence (e.g. Public domain)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-postal-red"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-postal-red text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Stamp' : 'Add Stamp'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}