import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  Phone,
  Mail,
  Edit,
  Send,
  X,
} from 'lucide-react'
import { formatCents } from '@/lib/utils'
import PhoneNumber, { Email } from '@/components/PhoneNumber'
import CustomerAvatar from '@/components/CustomerAvatar'
import TagBadge from '@/components/TagBadge'
import TagSelector from '@/components/TagSelector'

export default function CustomerHeaderCard({
  selectedCustomer,
  healthData,
  removeTagMutation,
  setSelectedCustomerId,
  setIsSmsOpen,
  handleEditOpen,
}) {
  return (
    <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 -ml-2 h-11 w-11"
            onClick={() => setSelectedCustomerId(null)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CustomerAvatar
            firstName={selectedCustomer.first_name}
            lastName={selectedCustomer.last_name}
            size="lg"
            className="h-11 w-11 sm:h-12 sm:w-12 text-base bg-blue-600 text-white"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </h2>
              {healthData && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-600">
                  {healthData.health_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <PhoneNumber phone={selectedCustomer.phone} email={selectedCustomer.email} />
              </span>
              {selectedCustomer.email && (
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <Email email={selectedCustomer.email} />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 hidden sm:block">
              Customer since {format(new Date(selectedCustomer.created_at), 'MMMM yyyy')}
            </p>
            {/* Tags */}
            {(selectedCustomer.tags?.length > 0 || true) && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {selectedCustomer.tags?.map(tag => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="md"
                    onRemove={(tagId) => removeTagMutation.mutate({ customerId: selectedCustomer.id, tagId })}
                  />
                ))}
                <TagSelector customerId={selectedCustomer.id} assignedTags={selectedCustomer.tags || []} />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsSmsOpen(true)} className="hidden sm:flex">
            <Send className="h-4 w-4 mr-1" />
            SMS
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSmsOpen(true)} className="sm:hidden">
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditOpen} className="hidden sm:flex">
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="icon" onClick={handleEditOpen} className="sm:hidden">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedCustomerId(null)} className="hidden lg:flex">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
        <div className="text-center bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 shadow-sm">
          <p className="text-lg font-semibold text-white">
            {healthData?.stats?.total_visits || selectedCustomer.total_visits || 0}
          </p>
          <p className="text-xs text-white/70">Visits</p>
        </div>
        <div className="text-center bg-gradient-to-br from-emerald-dark to-emerald rounded-lg p-2 shadow-sm">
          <p className="text-lg font-semibold text-white">
            {healthData?.stats?.total_spend ? formatCents(healthData.stats.total_spend) : '$0'}
          </p>
          <p className="text-xs text-white/70">Total Spend</p>
        </div>
        <div className="text-center bg-gradient-to-br from-blue-500 to-blue-400 rounded-lg p-2 shadow-sm">
          <p className="text-lg font-semibold text-white">
            {selectedCustomer.vehicles?.length || 0}
          </p>
          <p className="text-xs text-white/70">Vehicles</p>
        </div>
        <div className="text-center bg-gradient-to-br from-slateblue-dark to-slateblue rounded-lg p-2 shadow-sm">
          <p className="text-lg font-semibold text-white">
            {healthData?.health_score || '-'}
          </p>
          <p className="text-xs text-white/70">Health Score</p>
        </div>
      </div>
    </div>
  )
}
