import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

export default function AddVehicleDialog({
  isAddVehicleOpen,
  setIsAddVehicleOpen,
  vehicleForm,
  setVehicleForm,
  handleAddVehicleSubmit,
  addVehicleMutation,
}) {
  return (
    <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddVehicleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2024"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  placeholder="Toyota"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="Camry"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="Silver"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  placeholder="ABC 123"
                  value={vehicleForm.license_plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mileage">Mileage (km)</Label>
              <Input
                id="mileage"
                type="number"
                placeholder="50000"
                value={vehicleForm.mileage}
                onChange={(e) => setVehicleForm({ ...vehicleForm, mileage: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={vehicleForm.is_primary}
                onChange={(e) => setVehicleForm({ ...vehicleForm, is_primary: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="is_primary" className="font-normal">Set as primary vehicle</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addVehicleMutation.isPending}>
              {addVehicleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
