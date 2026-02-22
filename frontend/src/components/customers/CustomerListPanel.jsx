import { Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import PhoneNumber from '@/components/PhoneNumber'
import TagBadge from '@/components/TagBadge'

export default function CustomerListPanel({
  searchTerm,
  setSearchTerm,
  isLoading,
  sortedAndFilteredCustomers,
  selectedCustomerId,
  setSelectedCustomerId,
  selection,
}) {
  return (
    <div className={cn(
      "flex flex-col bg-white shadow-lg border-0 rounded-lg overflow-hidden",
      "w-full lg:w-96",
      selectedCustomerId ? "hidden lg:flex" : "flex"
    )}>
      {/* Search Header */}
      <div data-tour="customers-search" className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-10 text-sm border-slate-300 focus:border-slate-400 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea data-tour="customers-list" className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : sortedAndFilteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 p-5 mb-4 shadow-inner mx-auto w-fit">
              <User className="h-10 w-10 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-700 text-base">No customers found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div>
            {/* Desktop: Table Layout */}
            <div className="hidden sm:block">
              <div className="divide-y divide-slate-100">
                {sortedAndFilteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={cn(
                      "w-full flex items-center gap-2 py-2.5 px-3 text-left hover:bg-slate-50 rounded-lg transition-colors group",
                      selectedCustomerId === customer.id && "bg-blue-50 border-l-2 border-l-blue-600"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 shrink-0"
                      checked={selection.isSelected(customer.id)}
                      onChange={() => selection.toggle(customer.id)}
                    />
                    <button
                      className="flex-1 min-w-0 flex items-center gap-2"
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 truncate group-hover:text-blue-700 text-left">
                        {customer.first_name} {customer.last_name}
                        {customer.tags?.length > 0 && (
                          <span className="inline-flex items-center gap-1 ml-2">
                            {customer.tags.slice(0, 2).map(tag => (
                              <TagBadge key={tag.id} tag={tag} size="sm" />
                            ))}
                            {customer.tags.length > 2 && (
                              <span className="text-xs text-slate-400">+{customer.tags.length - 2}</span>
                            )}
                          </span>
                        )}
                      </span>
                      <div className="w-12 shrink-0 flex justify-end">
                        {customer.total_visits > 0 ? (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                            {customer.total_visits}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">{'\u2014'}</span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: Card Layout */}
            <div className="sm:hidden divide-y divide-slate-100">
              {sortedAndFilteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-3 hover:bg-slate-50 transition-colors",
                    selectedCustomerId === customer.id && "bg-blue-50 border-l-2 border-l-blue-600"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 shrink-0"
                    checked={selection.isSelected(customer.id)}
                    onChange={() => selection.toggle(customer.id)}
                  />
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {customer.first_name} {customer.last_name}
                      </span>
                      {customer.total_visits > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2">
                          {customer.total_visits} visits
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {customer.phone ? <PhoneNumber phone={customer.phone} /> : '\u2014'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-500">{sortedAndFilteredCustomers.length} results</p>
      </div>
    </div>
  )
}
