import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { campaigns as campaignsApi, customers as customersApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Megaphone,
  Settings,
  Send,
  Plus,
  Loader2,
  Play,
  Pause,
  Pencil,
  Trash2,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'follow_up', label: 'Follow-Up' },
  { value: 'win_back', label: 'Win-Back' },
  { value: 'seasonal', label: 'Seasonal' },
]

const TYPE_COLORS = {
  welcome: 'bg-emerald-100 text-emerald-700',
  follow_up: 'bg-blue-100 text-blue-700',
  win_back: 'bg-purple-100 text-purple-700',
  seasonal: 'bg-amber-100 text-amber-700',
}

const TYPE_LABELS = {
  welcome: 'Welcome',
  follow_up: 'Follow-Up',
  win_back: 'Win-Back',
  seasonal: 'Seasonal',
}

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-slate-100 text-slate-600',
  draft: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
}

const TEMPLATE_VARS = [
  { label: 'First Name', value: '{first_name}' },
  { label: 'Vehicle', value: '{vehicle}' },
  { label: 'Portal Link', value: '{portal_link}' },
  { label: 'Business Name', value: '{business_name}' },
  { label: 'Business Phone', value: '{business_phone}' },
  { label: 'Agent Name', value: '{agent_name}' },
]

// ── Toggle Switch (reused from ReviewSettingsDialog) ──
function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-xs text-slate-600">{label}</Label>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-blue-600' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

// ── Settings Dialog ──
function CampaignSettingsDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({
    welcome_enabled: true,
    follow_up_enabled: true,
    win_back_enabled: true,
    dedup_days: 30,
    win_back_days: 180,
  })
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['campaigns', 'settings'],
    queryFn: campaignsApi.getSettings,
    enabled: open,
  })

  useEffect(() => {
    if (!settings) return
    setForm({
      welcome_enabled: settings.welcome_enabled,
      follow_up_enabled: settings.follow_up_enabled,
      win_back_enabled: settings.win_back_enabled,
      dedup_days: settings.dedup_days || 30,
      win_back_days: settings.win_back_days || 180,
    })
  }, [settings])

  const mutation = useMutation({
    mutationFn: (data) => campaignsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Campaign Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Toggle
            checked={form.welcome_enabled}
            onChange={(v) => setForm({ ...form, welcome_enabled: v })}
            label="Welcome Campaign"
            description="Thank-you SMS after first visit"
          />
          <Toggle
            checked={form.follow_up_enabled}
            onChange={(v) => setForm({ ...form, follow_up_enabled: v })}
            label="Follow-Up Campaign"
            description="Check-in 3 days after service"
          />
          <Toggle
            checked={form.win_back_enabled}
            onChange={(v) => setForm({ ...form, win_back_enabled: v })}
            label="Win-Back Campaign"
            description="Re-engage inactive customers"
          />
          <div className="flex items-center gap-3">
            <Label className="w-40 text-xs text-slate-600 shrink-0">Dedup window (days)</Label>
            <Input
              type="number"
              min="7"
              max="365"
              value={form.dedup_days}
              onChange={(e) => setForm({ ...form, dedup_days: e.target.value })}
              className="h-9 text-sm w-20"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-40 text-xs text-slate-600 shrink-0">Win-back after (days)</Label>
            <Input
              type="number"
              min="30"
              max="730"
              value={form.win_back_days}
              onChange={(e) => setForm({ ...form, win_back_days: e.target.value })}
              className="h-9 text-sm w-20"
            />
          </div>
          <p className="text-xs text-slate-400">
            Auto campaigns run daily at 10 AM EST on weekdays.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({
              welcome_enabled: form.welcome_enabled,
              follow_up_enabled: form.follow_up_enabled,
              win_back_enabled: form.win_back_enabled,
              dedup_days: Number(form.dedup_days),
              win_back_days: Number(form.win_back_days),
            })}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── New / Edit Campaign Dialog ──
function CampaignFormDialog({ open, onOpenChange, campaign = null }) {
  const isEdit = !!campaign
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: campaign?.name || '',
    campaign_type: campaign?.campaign_type || 'seasonal',
    message_template: campaign?.message_template || '',
    audience_filter: campaign?.audience_filter || {},
  })

  // Tags for audience filter
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: customersApi.listTags,
    enabled: open,
  })
  const tags = tagsData?.tags || []

  const createMutation = useMutation({
    mutationFn: (data) => isEdit ? campaignsApi.update(campaign.id, data) : campaignsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      onOpenChange(false)
      toast({ title: isEdit ? 'Campaign updated' : 'Campaign created' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const insertVar = (v) => {
    setForm({ ...form, message_template: form.message_template + v })
  }

  const isAutoType = ['welcome', 'follow_up', 'win_back'].includes(form.campaign_type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Campaign Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Winter Tire Special"
              className="h-9 text-sm"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Type</Label>
              <select
                value={form.campaign_type}
                onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="seasonal">Seasonal / Manual</option>
                <option value="welcome">Welcome</option>
                <option value="follow_up">Follow-Up</option>
                <option value="win_back">Win-Back</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-600">Message Template</Label>
              <span className={cn(
                'text-xs',
                form.message_template.length > 480 ? 'text-red-500' : 'text-slate-400'
              )}>
                {form.message_template.length}/480
              </span>
            </div>
            <textarea
              value={form.message_template}
              onChange={(e) => setForm({ ...form, message_template: e.target.value })}
              placeholder="Hi {first_name}, ..."
              rows={4}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => insertVar(v.value)}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  + {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience filters — only for seasonal */}
          {form.campaign_type === 'seasonal' && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <Label className="text-xs text-slate-600 font-semibold">Audience Filters</Label>

              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Tags (optional)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const selected = (form.audience_filter.tags || []).includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            const current = form.audience_filter.tags || []
                            const next = selected
                              ? current.filter((id) => id !== tag.id)
                              : [...current, tag.id]
                            setForm({
                              ...form,
                              audience_filter: { ...form.audience_filter, tags: next },
                            })
                          }}
                          className={cn(
                            'text-xs px-2 py-1 rounded-full border transition-colors',
                            selected
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          )}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-slate-500 shrink-0">Min visits</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.audience_filter.min_visits || ''}
                  onChange={(e) => setForm({
                    ...form,
                    audience_filter: { ...form.audience_filter, min_visits: e.target.value ? Number(e.target.value) : undefined },
                  })}
                  placeholder="Any"
                  className="h-8 text-sm w-20"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-slate-500 shrink-0">Last visit before</Label>
                <Input
                  type="date"
                  value={form.audience_filter.last_visit_before || ''}
                  onChange={(e) => setForm({
                    ...form,
                    audience_filter: { ...form.audience_filter, last_visit_before: e.target.value || undefined },
                  })}
                  className="h-8 text-sm w-40"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="w-32 text-xs text-slate-500 shrink-0">Last visit after</Label>
                <Input
                  type="date"
                  value={form.audience_filter.last_visit_after || ''}
                  onChange={(e) => setForm({
                    ...form,
                    audience_filter: { ...form.audience_filter, last_visit_after: e.target.value || undefined },
                  })}
                  className="h-8 text-sm w-40"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              name: form.name,
              campaign_type: form.campaign_type,
              message_template: form.message_template,
              audience_filter: form.audience_filter,
            })}
            disabled={createMutation.isPending || !form.name.trim() || !form.message_template.trim()}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Send History Dialog ──
function SendHistoryDialog({ open, onOpenChange, campaign }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', 'detail', campaign?.id],
    queryFn: () => campaignsApi.get(campaign.id),
    enabled: open && !!campaign,
  })
  const sends = data?.sends || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send History — {campaign?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
              ))}
            </div>
          ) : sends.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No sends yet</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {sends.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-slate-700">
                      {s.customer ? `${s.customer.first_name || ''} ${s.customer.last_name || ''}`.trim() : 'Unknown'}
                    </span>
                    {s.skip_reason && (
                      <span className="text-xs text-slate-400 ml-2">{s.skip_reason.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn(
                      'text-xs',
                      s.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {s.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {s.sent_at ? format(new Date(s.sent_at), 'MMM d, h:mm a') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Campaigns Page ──
export default function Campaigns() {
  const [activeTab, setActiveTab] = useState('all')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [editCampaign, setEditCampaign] = useState(null)
  const [historyCampaign, setHistoryCampaign] = useState(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: stats } = useQuery({
    queryKey: ['campaigns', 'stats'],
    queryFn: campaignsApi.stats,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', 'list', activeTab],
    queryFn: () => campaignsApi.list({
      campaign_type: activeTab === 'all' ? undefined : activeTab,
    }),
  })
  const list = data?.campaigns || []

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => campaignsApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const sendMutation = useMutation({
    mutationFn: (id) => campaignsApi.send(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign sent', description: `${data.sent} messages sent, ${data.skipped} skipped` })
    },
    onError: (err) => toast({ title: 'Send failed', description: err.message, variant: 'destructive' }),
  })

  const previewMutation = useMutation({
    mutationFn: (id) => campaignsApi.send(id, true),
    onSuccess: (data) => {
      toast({
        title: 'Audience Preview',
        description: `${data.eligible} eligible customers (${data.deduped} deduped from ${data.total_audience} total)`,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => campaignsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign deleted' })
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const isAutoType = (type) => ['welcome', 'follow_up', 'win_back'].includes(type)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 -mx-4 sm:-mx-6 px-4 pl-14 sm:px-6 lg:pl-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-amber-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Campaigns</h1>
              <p className="text-xs text-slate-400">Automated & manual marketing campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-slate-500">Total Sent</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.total_sent || 0}</p>
          <p className="text-xs text-slate-400">{stats?.sent_30d || 0} in last 30 days</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-slate-500">Delivery Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.delivery_rate || '100.0'}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-slate-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.active_campaigns || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-500">Failed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats?.total_failed || 0}</p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-lg border-0 p-4">
              <div className="h-16 bg-slate-100 animate-pulse rounded" />
            </div>
          ))
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg border-0 p-12 text-center">
            <Megaphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No campaigns found</p>
            <p className="text-xs text-slate-400 mt-1">Create a seasonal campaign to get started</p>
          </div>
        ) : (
          list.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-lg border-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-800">{campaign.name}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded', TYPE_COLORS[campaign.campaign_type])}>
                      {TYPE_LABELS[campaign.campaign_type]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded capitalize', STATUS_COLORS[campaign.status])}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {campaign.message_template}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{campaign.total_sent} sent</span>
                    {campaign.total_failed > 0 && (
                      <span className="text-red-400">{campaign.total_failed} failed</span>
                    )}
                    {campaign.updated_at && (
                      <span>Updated {format(new Date(campaign.updated_at), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle active/paused for auto campaigns */}
                  {isAutoType(campaign.campaign_type) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleMutation.mutate({
                        id: campaign.id,
                        status: campaign.status === 'active' ? 'paused' : 'active',
                      })}
                      title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {campaign.status === 'active'
                        ? <Pause className="h-4 w-4 text-amber-500" />
                        : <Play className="h-4 w-4 text-emerald-500" />
                      }
                    </Button>
                  )}

                  {/* Preview audience (seasonal) */}
                  {campaign.campaign_type === 'seasonal' && campaign.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => previewMutation.mutate(campaign.id)}
                      disabled={previewMutation.isPending}
                      title="Preview audience"
                    >
                      <Users className="h-4 w-4 text-blue-500" />
                    </Button>
                  )}

                  {/* Send now (seasonal) */}
                  {campaign.campaign_type === 'seasonal' && campaign.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Send "${campaign.name}" to all matching customers?`)) {
                          sendMutation.mutate(campaign.id)
                        }
                      }}
                      disabled={sendMutation.isPending}
                      title="Send now"
                    >
                      <Send className="h-4 w-4 text-emerald-500" />
                    </Button>
                  )}

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditCampaign(campaign)}
                    title="Edit template"
                  >
                    <Pencil className="h-4 w-4 text-slate-400" />
                  </Button>

                  {/* View history */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setHistoryCampaign(campaign)}
                    title="View send history"
                  >
                    <Eye className="h-4 w-4 text-slate-400" />
                  </Button>

                  {/* Delete (seasonal only) */}
                  {!isAutoType(campaign.campaign_type) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm(`Delete "${campaign.name}"?`)) {
                          deleteMutation.mutate(campaign.id)
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialogs */}
      <CampaignSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {newOpen && <CampaignFormDialog open={newOpen} onOpenChange={setNewOpen} />}
      {editCampaign && (
        <CampaignFormDialog
          open={!!editCampaign}
          onOpenChange={(v) => { if (!v) setEditCampaign(null) }}
          campaign={editCampaign}
        />
      )}
      {historyCampaign && (
        <SendHistoryDialog
          open={!!historyCampaign}
          onOpenChange={(v) => { if (!v) setHistoryCampaign(null) }}
          campaign={historyCampaign}
        />
      )}
    </div>
  )
}
