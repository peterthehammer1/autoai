import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  Calendar,
  MessageSquare,
  BarChart3,
  Users,
  Car,
  Clock,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  Play,
  Star,
  PhoneCall,
  Bot,
  TrendingUp,
  Heart,
  Bell,
  Mic,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Feature data
const features = [
  {
    icon: Bot,
    title: '24/7 AI Voice Booking',
    description: 'Our AI agent Amber handles calls around the clock, booking appointments, answering questions, and providing quotes - just like your best service advisor.',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Intelligent calendar management with real-time availability, bay assignments, and estimated completion times. Never double-book again.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Complete customer profiles with vehicle history, service records, health scores, and AI-powered recommendations for upselling.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Real-time dashboards showing conversion rates, revenue trends, customer sentiment, and AI-generated business insights.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: MessageSquare,
    title: 'SMS & Email Automation',
    description: 'Automatic confirmations, reminders, and follow-ups. Keep customers informed without lifting a finger.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption, GDPR compliant, and SOC 2 certified. Your customer data is always protected.',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
]

const stats = [
  { value: '24/7', label: 'AI Availability', icon: Clock },
  { value: '95%', label: 'Booking Rate', icon: TrendingUp },
  { value: '<3s', label: 'Response Time', icon: Zap },
  { value: '4.9★', label: 'Customer Rating', icon: Star },
]

const capabilities = [
  'Book new appointments',
  'Reschedule existing bookings',
  'Cancel appointments',
  'Provide service quotes',
  'Answer business questions',
  'Handle multiple vehicles',
  'Process tow requests',
  'Send confirmations via SMS',
]

const testimonials = [
  {
    quote: "Nucleus gives us peace of mind and time freedom.",
    author: "Nikita Nathwani",
    role: "9Round Owner",
    rating: 5,
    logo: "9Round",
  },
  {
    quote: "I've tried six or seven AI receptionist services. They're not as good as carrying on a conversation as Nucleus AI.",
    author: "Richard M Sedler",
    role: "President & CEO, RMS Media Group Inc.",
    rating: 5,
    logo: "RMS",
  },
]

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white" itemScope itemType="https://schema.org/AutoRepair">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Premier Auto" className="h-10 w-10 rounded-lg" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 leading-tight">Premier Auto</span>
                <span className="text-[10px] text-slate-500 leading-tight">Powered by <span className="font-semibold">Nucleus</span></span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Testimonials</a>
              <a href="tel:+16473711990" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                <Phone className="h-4 w-4" />
                (647) 371-1990
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <a href="tel:+16473711990">
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Book Now
                </a>
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-3">
            <a href="#features" className="block py-2 text-slate-600">Features</a>
            <a href="#how-it-works" className="block py-2 text-slate-600">How It Works</a>
            <a href="#testimonials" className="block py-2 text-slate-600">Testimonials</a>
            <a href="tel:+16473711990" className="block py-2 text-slate-600 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              (647) 371-1990
            </a>
            <div className="pt-3 space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700" asChild>
                <a href="tel:+16473711990">
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Book Now
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div className="text-center lg:text-left">
              <Badge className="mb-4 bg-violet-100 text-violet-700 hover:bg-violet-100 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Powered Auto Service
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight" itemProp="name">
                Your AI Service Advisor,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  Available 24/7
                </span>
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0" itemProp="description">
                Meet Amber — your AI-powered service advisor who books appointments, answers questions, 
                and delights customers around the clock. Never miss another call.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 h-14" asChild>
                  <a href="tel:+16473711990" itemProp="telephone">
                    <PhoneCall className="h-5 w-5 mr-2" />
                    Call to Book: (647) 371-1990
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 h-14" asChild>
                  <Link to="/dashboard">
                    View Dashboard
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>No wait times</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>Instant booking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>SMS confirmation</span>
                </div>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-md px-3 py-1 text-xs text-slate-400 text-center">
                      premierauto.ai/dashboard
                    </div>
                  </div>
                </div>
                {/* Dashboard preview image placeholder */}
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 p-6">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {stats.map((stat, i) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700">
                        <stat.icon className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Today's Schedule</span>
                      </div>
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
                            <div className="h-8 w-12 bg-slate-600 rounded text-center py-1">
                              <span className="text-xs font-bold text-white">{8 + i}:00</span>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 w-24 bg-slate-600 rounded" />
                              <div className="h-2 w-16 bg-slate-700 rounded mt-1" />
                            </div>
                            <div className="h-5 w-16 bg-emerald-500/20 rounded text-[10px] text-emerald-400 flex items-center justify-center">
                              Confirmed
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-white">AI Status</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400">Online</span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Calls Today</span>
                          <span className="text-white font-medium">24</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bookings</span>
                          <span className="text-white font-medium">18</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate</span>
                          <span className="text-emerald-400 font-medium">95%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-slate-200 animate-float">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Appointment Booked!</p>
                    <p className="text-xs text-slate-500">Oil change • Tomorrow 9 AM</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-slate-200 animate-float-delayed">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Mic className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Amber is speaking...</p>
                    <p className="text-xs text-slate-500">"I have 9 AM available..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
                  <stat.icon className="h-6 w-6" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Everything You Need to Run Your Shop
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              A complete platform for modern auto service centers. From AI-powered booking 
              to advanced analytics, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300"
              >
                <div className={cn(
                  "inline-flex items-center justify-center h-14 w-14 rounded-xl mb-6",
                  feature.bgColor
                )}>
                  <feature.icon className={cn("h-7 w-7", feature.iconColor)} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
                <div className={cn(
                  "absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
                  feature.color
                )} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10 border-white/20">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Meet Amber, Your AI Service Advisor
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Amber handles your calls just like your best employee — friendly, knowledgeable, 
              and always available.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Capabilities */}
            <div>
              <h3 className="text-2xl font-semibold mb-6">What Amber Can Do</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">{cap}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl border border-violet-500/30">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Natural Conversations</h4>
                    <p className="text-slate-400 text-sm">
                      Amber uses advanced AI to have natural, human-like conversations. 
                      Customers often don't realize they're talking to an AI.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Conversation Example */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                <div className="h-10 w-10 rounded-full bg-violet-500 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white">Live Call Demo</p>
                  <p className="text-sm text-slate-400">Amber handling a booking request</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">Active</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="bg-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-slate-200">
                      "Thanks for calling Premier Auto Service, this is Amber. How can I help you today?"
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <div className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white">
                      "Hi, I need to schedule an oil change for my Honda Civic."
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="bg-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-slate-200">
                      "I'd be happy to help with that! I see you're calling from a number ending in 8959. 
                      Let me pull up your account... I have tomorrow at 9 AM or Thursday at 2 PM available. 
                      Which works better for you?"
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <div className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white">
                      "Tomorrow at 9 works great!"
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-violet-400" />
                  </div>
                  <div className="bg-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-slate-200">
                      "Perfect! You're all set for tomorrow, January 30th at 9 AM for an oil change 
                      on your Honda Civic. I'll send you a confirmation text. Is there anything else 
                      I can help you with?"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-100 text-amber-700 hover:bg-amber-100">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Loved by Businesses Everywhere
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              See what owners are saying about Nucleus AI.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed text-lg">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.author}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Auto Shop?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Join thousands of businesses using AI to book more appointments, 
            delight customers, and grow their business.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 h-14" asChild>
              <a href="tel:+16473711990">
                <PhoneCall className="h-5 w-5 mr-2" />
                Call Now: (647) 371-1990
              </a>
            </Button>
            <Button size="lg" className="bg-white/20 text-white border-2 border-white hover:bg-white/30 text-lg px-8 h-14" asChild>
              <a href="mailto:service@premierauto.ai">
                <MessageSquare className="h-5 w-5 mr-2" />
                Contact Us
              </a>
            </Button>
          </div>

          <p className="mt-8 text-blue-200 text-sm">
            Available 24/7 • Instant booking • SMS confirmation
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="Premier Auto" className="h-10 w-10 rounded-lg" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white leading-tight">Premier Auto Service</span>
                  <span className="text-xs text-slate-400 leading-tight">Powered by <span className="font-semibold text-slate-300">Nucleus</span></span>
                </div>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                AI-powered auto service booking platform. Available 24/7 to help you 
                schedule appointments, answer questions, and keep your vehicle running smoothly.
              </p>
              <div className="flex items-center gap-4">
                <a href="tel:+16473711990" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
                  <Phone className="h-5 w-5" />
                  (647) 371-1990
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  (647) 371-1990
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  service@premierauto.ai
                </li>
                <li className="flex items-start gap-2">
                  <Car className="h-4 w-4 mt-0.5" />
                  1250 Industrial Boulevard<br />Springfield
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} Premier Auto Service. All rights reserved.
            </p>
            <p className="text-sm flex items-center gap-2">
              Powered by
              <span className="font-semibold text-white">Nucleus AI</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 0.5s;
        }
      `}</style>
    </div>
  )
}
