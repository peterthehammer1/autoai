import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspections } from '@/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Camera,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Car,
  X,
} from 'lucide-react'

const CONDITIONS = [
  { key: 'good', label: 'Good', icon: CheckCircle, color: 'bg-emerald-500 text-white', ring: 'ring-emerald-500' },
  { key: 'fair', label: 'Fair', icon: AlertTriangle, color: 'bg-amber-400 text-white', ring: 'ring-amber-400' },
  { key: 'needs_attention', label: 'Attention', icon: AlertCircle, color: 'bg-orange-500 text-white', ring: 'ring-orange-500' },
  { key: 'urgent', label: 'Urgent', icon: XCircle, color: 'bg-red-600 text-white', ring: 'ring-red-600' },
]

const CONDITION_DOT = {
  good: 'bg-emerald-500',
  fair: 'bg-amber-400',
  needs_attention: 'bg-orange-500',
  urgent: 'bg-red-600',
  not_inspected: 'bg-slate-300',
}

/**
 * Compress image using Canvas API before upload
 */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function InspectionEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedCategories, setExpandedCategories] = useState({})
  const [completing, setCompleting] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadingItemId, setUploadingItemId] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspections.get(id),
    refetchInterval: 10000,
  })

  const inspection = data?.inspection
  const items = inspection?.inspection_items || []
  const vehicle = inspection?.vehicle
  const technician = inspection?.technician

  // Group items by category
  const categories = {}
  for (const item of items) {
    if (!categories[item.category]) categories[item.category] = []
    categories[item.category].push(item)
  }

  // Auto-expand all categories on first load
  useEffect(() => {
    if (items.length > 0 && Object.keys(expandedCategories).length === 0) {
      const expanded = {}
      for (const item of items) {
        expanded[item.category] = true
      }
      setExpandedCategories(expanded)
    }
  }, [items.length])

  // Progress
  const totalItems = items.length
  const inspectedCount = items.filter(i => i.condition !== 'not_inspected').length
  const progressPct = totalItems > 0 ? Math.round((inspectedCount / totalItems) * 100) : 0

  // Update item condition
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, condition, notes }) =>
      inspections.updateItem(id, itemId, { condition, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection', id] }),
  })

  const handleConditionChange = (itemId, condition) => {
    updateItemMutation.mutate({ itemId, condition })
  }

  const handleNotesChange = (itemId, notes) => {
    updateItemMutation.mutate({ itemId, notes })
  }

  // Photo upload
  const handlePhotoCapture = (itemId) => {
    setUploadingItemId(itemId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadingItemId) return
    e.target.value = '' // reset for next capture

    try {
      // Compress
      const blob = await compressImage(file)

      // Get signed upload URL
      const { signedUrl, publicUrl } = await inspections.getUploadUrl(id, uploadingItemId)

      // Upload to Supabase
      await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      })

      // Register photo
      await inspections.addPhoto(id, uploadingItemId, { photo_url: publicUrl })

      queryClient.invalidateQueries({ queryKey: ['inspection', id] })
    } catch (err) {
      alert('Photo upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setUploadingItemId(null)
    }
  }

  // Delete photo
  const deletePhotoMutation = useMutation({
    mutationFn: ({ itemId, photoId }) =>
      inspections.deletePhoto(id, itemId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection', id] }),
  })

  // Complete inspection
  const handleComplete = async () => {
    setCompleting(true)
    try {
      await inspections.update(id, { status: 'completed' })
      queryClient.invalidateQueries({ queryKey: ['inspection', id] })
      navigate(-1)
    } catch (err) {
      alert('Failed to complete: ' + err.message)
    } finally {
      setCompleting(false)
    }
  }

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Failed to load inspection</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              Vehicle Inspection
            </h1>
            {vehicle && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Car className="h-3 w-3" />
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            )}
          </div>
          {technician && (
            <span className="text-xs text-slate-400">
              {technician.first_name} {technician.last_name}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            {inspectedCount}/{totalItems}
          </span>
        </div>
      </div>

      {/* Category sections */}
      <div className="divide-y divide-slate-200">
        {Object.entries(categories).map(([category, catItems]) => {
          const expanded = expandedCategories[category]
          const catDots = catItems.map(i => i.condition)

          return (
            <div key={category}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 text-slate-400" />
                  }
                  <span className="text-sm font-semibold text-slate-700">{category}</span>
                </div>
                <div className="flex gap-1">
                  {catDots.map((cond, i) => (
                    <div key={i} className={cn('h-2 w-2 rounded-full', CONDITION_DOT[cond])} />
                  ))}
                </div>
              </button>

              {/* Items */}
              {expanded && (
                <div className="divide-y divide-slate-100">
                  {catItems.map(item => (
                    <InspectionItem
                      key={item.id}
                      item={item}
                      onConditionChange={(cond) => handleConditionChange(item.id, cond)}
                      onNotesChange={(notes) => handleNotesChange(item.id, notes)}
                      onPhotoCapture={() => handlePhotoCapture(item.id)}
                      onDeletePhoto={(photoId) => deletePhotoMutation.mutate({ itemId: item.id, photoId })}
                      isUploading={uploadingItemId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleComplete}
            disabled={completing || inspectedCount < totalItems}
            className={cn(
              'w-full',
              inspectedCount === totalItems
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-300'
            )}
          >
            {completing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Completing...</>
            ) : inspectedCount === totalItems ? (
              <><CheckCircle className="h-4 w-4 mr-2" /> Complete Inspection</>
            ) : (
              `${totalItems - inspectedCount} items remaining`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Inspection Item Component ──

function InspectionItem({ item, onConditionChange, onNotesChange, onPhotoCapture, onDeletePhoto, isUploading }) {
  const [showNotes, setShowNotes] = useState(!!item.notes)
  const [notesValue, setNotesValue] = useState(item.notes || '')
  const notesTimeout = useRef(null)

  // Update notes value when item changes (from server)
  useEffect(() => {
    setNotesValue(item.notes || '')
  }, [item.notes])

  const handleNotesInput = (val) => {
    setNotesValue(val)
    clearTimeout(notesTimeout.current)
    notesTimeout.current = setTimeout(() => onNotesChange(val), 800)
  }

  const photos = item.inspection_photos || []

  return (
    <div className="px-4 py-3">
      {/* Item name */}
      <p className="text-sm font-medium text-slate-800 mb-2">{item.item_name}</p>

      {/* Condition buttons */}
      <div className="flex gap-2 mb-2">
        {CONDITIONS.map(cond => {
          const Icon = cond.icon
          const isActive = item.condition === cond.key
          return (
            <button
              key={cond.key}
              onClick={() => onConditionChange(cond.key)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition-all min-h-[52px]',
                isActive
                  ? `${cond.color} border-transparent ring-2 ${cond.ring}`
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-none">{cond.label}</span>
            </button>
          )
        })}
      </div>

      {/* Notes toggle + textarea */}
      {!showNotes && item.condition !== 'not_inspected' && (
        <button
          onClick={() => setShowNotes(true)}
          className="text-xs text-blue-600 hover:underline mb-2"
        >
          + Add notes
        </button>
      )}
      {showNotes && (
        <textarea
          value={notesValue}
          onChange={(e) => handleNotesInput(e.target.value)}
          placeholder="Notes (e.g., 3mm remaining, recommend replacement)"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
        />
      )}

      {/* Photos */}
      <div className="flex items-center gap-2 flex-wrap">
        {photos.map(photo => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.photo_url}
              alt={photo.caption || item.item_name}
              className="h-16 w-16 object-cover rounded-lg border border-slate-200"
            />
            <button
              onClick={() => onDeletePhoto(photo.id)}
              className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Camera button */}
        {item.condition !== 'not_inspected' && (
          <button
            onClick={onPhotoCapture}
            disabled={isUploading}
            className="h-16 w-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="text-[9px] mt-0.5">Photo</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
