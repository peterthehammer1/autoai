import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="agent">AI Agent</TabsTrigger>
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
      </Tabs>
    </div>
  )
}
