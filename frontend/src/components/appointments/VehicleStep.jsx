import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import CarImage from '@/components/CarImage'
import { Car, Check, Plus } from 'lucide-react'

function VehicleStep({
  customer,
  selectedVehicle,
  setSelectedVehicle,
  isNewVehicle,
  setIsNewVehicle,
  newVehicleForm,
  setNewVehicleForm,
}) {
  return (
    <div className="space-y-4">
      {/* Existing Vehicles */}
      {customer?.vehicles?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Customer's Vehicles
          </h3>
          {customer.vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedVehicle?.id === vehicle.id &&
                  'ring-2 ring-primary border-primary'
              )}
              onClick={() => {
                setSelectedVehicle(vehicle)
                setIsNewVehicle(false)
              }}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CarImage make={vehicle.make} model={vehicle.model} year={vehicle.year} size="sm" />
                  <div>
                    <p className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.color && `${vehicle.color} · `}
                      {vehicle.mileage
                        ? `${vehicle.mileage.toLocaleString()} km`
                        : 'Mileage unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {vehicle.is_primary && (
                    <Badge variant="secondary">Primary</Badge>
                  )}
                  {selectedVehicle?.id === vehicle.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Vehicle */}
      <div className="space-y-2">
        {customer?.vehicles?.length > 0 && (
          <Separator className="my-4" />
        )}
        <Button
          variant={isNewVehicle ? 'default' : 'outline'}
          className="w-full"
          onClick={() => {
            setIsNewVehicle(true)
            setSelectedVehicle(null)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Vehicle
        </Button>

        {isNewVehicle && (
          <Card className="mt-4">
            <CardContent className="p-4 space-y-4">
              {/* Live car image preview */}
              {newVehicleForm.make && newVehicleForm.model && (
                <div className="flex justify-center">
                  <CarImage make={newVehicleForm.make} model={newVehicleForm.model} year={newVehicleForm.year} size="lg" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Year *
                  </label>
                  <Input
                    placeholder="2024"
                    value={newVehicleForm.year}
                    onChange={(e) =>
                      setNewVehicleForm((prev) => ({
                        ...prev,
                        year: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Make *
                  </label>
                  <Input
                    placeholder="Honda"
                    value={newVehicleForm.make}
                    onChange={(e) =>
                      setNewVehicleForm((prev) => ({
                        ...prev,
                        make: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Model *
                  </label>
                  <Input
                    placeholder="Accord"
                    value={newVehicleForm.model}
                    onChange={(e) =>
                      setNewVehicleForm((prev) => ({
                        ...prev,
                        model: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Color
                  </label>
                  <Input
                    placeholder="Silver"
                    value={newVehicleForm.color}
                    onChange={(e) =>
                      setNewVehicleForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Current Mileage (km)
                  </label>
                  <Input
                    placeholder="45000"
                    value={newVehicleForm.mileage}
                    onChange={(e) =>
                      setNewVehicleForm((prev) => ({
                        ...prev,
                        mileage: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {!customer?.vehicles?.length && !isNewVehicle && (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No vehicles on file</p>
          <p className="text-sm">Add a vehicle to continue</p>
        </div>
      )}
    </div>
  )
}

export default VehicleStep
