import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { Car, Plus } from 'lucide-react'
import CarImage from '@/components/CarImage'

export default function VehiclesTab({
  selectedCustomer,
  setIsAddVehicleOpen,
}) {
  return (
    <TabsContent value="vehicles" className="m-0 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Registered Vehicles</h3>
        <Button size="sm" onClick={() => setIsAddVehicleOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Add Vehicle</span>
        </Button>
      </div>
      {selectedCustomer.vehicles?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {selectedCustomer.vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <CarImage
                  make={vehicle.make}
                  model={vehicle.model}
                  year={vehicle.year}
                  size="md"
                  className="shrink-0 sm:h-20 sm:w-32"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    {vehicle.is_primary && (
                      <Badge className="bg-blue-50 text-blue-600 text-xs">Primary</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {vehicle.color && `${vehicle.color} \u2022 `}
                    {vehicle.mileage
                      ? `${vehicle.mileage.toLocaleString()} km`
                      : 'Mileage unknown'}
                  </p>
                  {vehicle.license_plate && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {vehicle.license_plate}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No vehicles registered</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsAddVehicleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add First Vehicle
          </Button>
        </div>
      )}
    </TabsContent>
  )
}
