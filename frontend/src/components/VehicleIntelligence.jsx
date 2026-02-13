import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customers } from '@/api'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Wrench,
  AlertTriangle,
  Loader2,
  Info,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function VehicleIntelligence({ customerId, vehicleId, vin }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicle-intelligence', customerId, vehicleId],
    queryFn: () => customers.getVehicleIntelligence(customerId, vehicleId),
    enabled: isExpanded && !!vin,
    staleTime: 10 * 60 * 1000, // 10 min
  })

  if (!vin) {
    return (
      <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5 border-t border-slate-100">
        <Info className="h-3 w-3" />
        No VIN on file — add VIN for vehicle intelligence
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        )}
        <Cpu className="h-3.5 w-3.5 text-blue-500" />
        Vehicle Intelligence
        {data?.recalls?.has_open_recalls && (
          <Badge className="ml-auto text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
            {data.recalls.count} Recall{data.recalls.count > 1 ? 's' : ''}
          </Badge>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading vehicle data...
            </div>
          ) : error || !data?.success ? (
            <p className="text-xs text-slate-400 py-2">
              {data?.error || 'Unable to load vehicle intelligence'}
            </p>
          ) : (
            <>
              {/* Specs */}
              {data.vehicle && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Specs</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {data.vehicle.engine?.description && (
                      <div>
                        <p className="text-slate-400">Engine</p>
                        <p className="text-slate-700 font-medium">{data.vehicle.engine.description}</p>
                      </div>
                    )}
                    {data.vehicle.transmission && (
                      <div>
                        <p className="text-slate-400">Transmission</p>
                        <p className="text-slate-700 font-medium">{data.vehicle.transmission}</p>
                      </div>
                    )}
                    {data.vehicle.drive_type && (
                      <div>
                        <p className="text-slate-400">Drivetrain</p>
                        <p className="text-slate-700 font-medium">{data.vehicle.drive_type}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recalls */}
              {data.recalls && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Recalls
                  </p>
                  {data.recalls.has_open_recalls ? (
                    <div className="space-y-1.5">
                      {data.recalls.items.map((recall, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-700">{recall.component}</p>
                            {recall.summary && (
                              <p className="text-slate-500 line-clamp-2">{recall.summary}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      No open recalls
                    </p>
                  )}
                </div>
              )}

              {/* Maintenance */}
              {data.maintenance && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    Maintenance
                  </p>
                  <div className="space-y-1.5">
                    {data.maintenance.recently_due?.map((item, idx) => (
                      <div key={`overdue-${idx}`} className="flex items-center gap-2 text-xs">
                        <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100 shrink-0">
                          Overdue
                        </Badge>
                        <span className="text-slate-700 truncate">
                          {item.services.slice(0, 2).join(', ')}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          {item.miles_overdue.toLocaleString()} mi
                        </span>
                      </div>
                    ))}
                    {data.maintenance.upcoming_services?.map((item, idx) => (
                      <div key={`upcoming-${idx}`} className="flex items-center gap-2 text-xs">
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 shrink-0">
                          Upcoming
                        </Badge>
                        <span className="text-slate-700 truncate">
                          {item.services.slice(0, 2).join(', ')}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          in {item.miles_until.toLocaleString()} mi
                        </span>
                      </div>
                    ))}
                    {!data.maintenance.recently_due?.length && !data.maintenance.upcoming_services?.length && (
                      <p className="text-xs text-slate-400">No maintenance data available</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
