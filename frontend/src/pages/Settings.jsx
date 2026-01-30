import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Building,
  Clock,
  Phone,
  Mail,
  MapPin,
  Palette,
  Bell,
  Bot,
  Users,
  Shield,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'
import { useAdminMode } from '@/components/PhoneNumber'

export default function Settings() {
  const { isAdmin, enableAdminMode, disableAdminMode } = useAdminMode()
  const [adminPin, setAdminPin] = useState('')
  const [pinError, setPinError] = useState('')
  
  // Simple PIN check - in production this should be server-side
  const ADMIN_PIN = '2499' // Last 4 digits of the business phone
  
  const handleAdminLogin = () => {
    if (adminPin === ADMIN_PIN) {
      enableAdminMode(30) // 30 minutes
      setAdminPin('')
      setPinError('')
    } else {
      setPinError('Incorrect PIN')
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your business configuration
          </p>
        </div>
        {isAdmin && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Eye className="h-3 w-3 mr-1" />
            Full Access Mode
          </Badge>
        )}
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="agent">AI Agent</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6 mt-6">
          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Your business name and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Name</label>
                  <Input defaultValue="Premier Auto Service Center" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input defaultValue="(555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue="service@premierauto.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input defaultValue="https://premierauto.com" />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Address</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Street Address</label>
                    <Input defaultValue="1250 Industrial Boulevard" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input defaultValue="Automotive City" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Province</label>
                      <Input defaultValue="ON" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Postal Code</label>
                      <Input defaultValue="N2N 3P4" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Customize your brand colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Color</label>
                  <div className="flex gap-2">
                    <Input defaultValue="#1e3a5f" className="flex-1" />
                    <div
                      className="h-10 w-10 rounded border"
                      style={{ backgroundColor: '#1e3a5f' }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secondary Color</label>
                  <div className="flex gap-2">
                    <Input defaultValue="#3b82f6" className="flex-1" />
                    <div
                      className="h-10 w-10 rounded border"
                      style={{ backgroundColor: '#3b82f6' }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
              <CardDescription>
                Set your operating hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { day: 'Monday', open: '07:00', close: '18:00' },
                  { day: 'Tuesday', open: '07:00', close: '18:00' },
                  { day: 'Wednesday', open: '07:00', close: '18:00' },
                  { day: 'Thursday', open: '07:00', close: '18:00' },
                  { day: 'Friday', open: '07:00', close: '18:00' },
                  { day: 'Saturday', open: '08:00', close: '16:00' },
                  { day: 'Sunday', open: '', close: '', closed: true },
                ].map((day) => (
                  <div
                    key={day.day}
                    className="flex items-center gap-4 py-2 border-b last:border-0"
                  >
                    <span className="w-28 font-medium">{day.day}</span>
                    {day.closed ? (
                      <span className="text-muted-foreground">Closed</span>
                    ) : (
                      <>
                        <Input
                          type="time"
                          defaultValue={day.open}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          defaultValue={day.close}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button>Save Hours</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure SMS and email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Appointment Confirmations</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Confirmation Message Template
                  </label>
                  <textarea
                    className="w-full min-h-24 rounded-md border p-3 text-sm"
                    defaultValue="Hi {first_name}! Your appointment at Premier Auto Service is confirmed for {day}, {date} at {time}. Services: {services}. Reply STOP to opt out."
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{first_name}'}, {'{day}'}, {'{date}'},{' '}
                    {'{time}'}, {'{services}'}, {'{vehicle}'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Appointment Reminders</h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Reminder Message Template
                  </label>
                  <textarea
                    className="w-full min-h-24 rounded-md border p-3 text-sm"
                    defaultValue="Reminder: You have an appointment tomorrow at {time} at Premier Auto Service for {services}. See you then!"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Templates</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Voice Agent
              </CardTitle>
              <CardDescription>
                Configure your Retell AI agent settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agent Name</label>
                  <Input defaultValue="Amber" />
                  <p className="text-xs text-muted-foreground">
                    The name your AI agent uses when greeting callers
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Greeting</label>
                  <Input defaultValue="Thanks for calling Premier Auto Service, this is Amber. How can I help you today?" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retell Agent ID</label>
                  <Input placeholder="agent_xxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    defaultValue="https://your-api.com/api/webhooks/retell"
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your Retell dashboard
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Access
              </CardTitle>
              <CardDescription>
                Control visibility of customer information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Eye className="h-5 w-5 text-green-600" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-slate-400" />
                    )}
                    <span className="font-medium">
                      {isAdmin ? 'Full Access Mode Active' : 'Privacy Mode Active'}
                    </span>
                  </div>
                  {isAdmin && (
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {isAdmin 
                    ? 'All customer phone numbers and details are visible. Access expires in 30 minutes or when you log out.'
                    : 'Customer phone numbers are masked (showing only last 4 digits). Click the eye icon next to any phone number to reveal it temporarily.'
                  }
                </p>
              </div>

              {/* Admin Login / Logout */}
              {isAdmin ? (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">End Full Access Session</p>
                      <p className="text-sm text-slate-600">
                        Return to privacy mode and mask all phone numbers
                      </p>
                    </div>
                    <Button variant="outline" onClick={disableAdminMode}>
                      <Lock className="h-4 w-4 mr-2" />
                      Lock Access
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <p className="font-medium mb-2">Enable Full Access (Admin)</p>
                    <p className="text-sm text-slate-600 mb-4">
                      Enter your PIN to view all customer information for 30 minutes
                    </p>
                    <div className="flex gap-2 max-w-xs">
                      <Input
                        type="password"
                        placeholder="Enter PIN"
                        value={adminPin}
                        onChange={(e) => {
                          setAdminPin(e.target.value)
                          setPinError('')
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                        maxLength={4}
                      />
                      <Button onClick={handleAdminLogin}>
                        <Eye className="h-4 w-4 mr-2" />
                        Unlock
                      </Button>
                    </div>
                    {pinError && (
                      <p className="text-sm text-red-500 mt-2">{pinError}</p>
                    )}
                  </div>
                </div>
              )}

              <Separator />
              
              {/* Info */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">How Privacy Mode Works</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Phone numbers are masked by default (•••-•••-1234)</li>
                  <li>• Click the eye icon to reveal a number for 5 minutes</li>
                  <li>• Full Access mode shows all numbers for 30 minutes</li>
                  <li>• Revealed numbers auto-hide after the time expires</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
