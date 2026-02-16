import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatPhone } from '@/lib/utils'
import {
  Search,
  User,
  Check,
  Loader2,
  Phone,
  Mail,
  X,
  AlertCircle,
} from 'lucide-react'

function CustomerStep({
  phoneSearch,
  setPhoneSearch,
  handlePhoneSearch,
  isSearching,
  customer,
  setCustomer,
  isNewCustomer,
  newCustomerForm,
  setNewCustomerForm,
  setSelectedVehicle,
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter phone number..."
          value={phoneSearch}
          onChange={(e) => setPhoneSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
          className="flex-1"
        />
        <Button onClick={handlePhoneSearch} disabled={isSearching} aria-label="Search customer">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Found Customer */}
      {customer && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Customer Found
                  </span>
                </div>
                <h3 className="text-lg font-semibold mt-2">
                  {customer.full_name || `${customer.first_name} ${customer.last_name}`}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formatPhone(customer.phone)}
                  </span>
                  {customer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </span>
                  )}
                </div>
                {customer.total_visits > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {customer.total_visits} previous visits
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Clear selected customer"
                onClick={() => {
                  setCustomer(null)
                  setPhoneSearch('')
                  setSelectedVehicle(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Customer Form */}
      {isNewCustomer && !customer && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">New Customer</span>
            </div>
            <p className="text-sm text-muted-foreground">
              No customer found with this phone number. Enter their details:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  First Name *
                </label>
                <Input
                  placeholder="First name"
                  aria-required="true"
                  value={newCustomerForm.first_name}
                  onChange={(e) =>
                    setNewCustomerForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Last Name
                </label>
                <Input
                  placeholder="Last name"
                  value={newCustomerForm.last_name}
                  onChange={(e) =>
                    setNewCustomerForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Phone *
                </label>
                <Input
                  placeholder="Phone number"
                  aria-required="true"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={newCustomerForm.email}
                  onChange={(e) =>
                    setNewCustomerForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!customer && !isNewCustomer && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Search for a customer by phone number</p>
          <p className="text-sm">or they will be created as new</p>
        </div>
      )}
    </div>
  )
}

export default CustomerStep
