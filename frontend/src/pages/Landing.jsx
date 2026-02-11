import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { leads } from '@/api'
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
  Star,
  PhoneCall,
  Bot,
  TrendingUp,
  Mic,
  Menu,
  X,
  ChevronDown,
  Wrench,
  Brain,
  Smartphone,
  HeartPulse,
  FileSearch,
  Truck,
  Bell,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Bot,
    title: '24/7 AI Voice Agent',
    description: 'Amber answers calls around the clock — booking appointments, answering questions, providing quotes, and handling reschedules. Customers can\'t tell it\'s AI.',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Real-time bay availability, automatic technician assignment based on skill level, and atomic booking that prevents double-booking.',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Smartphone,
    title: 'Two-Way SMS',
    description: 'Customers reply CONFIRM, CANCEL, or RESCHEDULE to manage appointments by text. Automatic confirmations and 24-hour reminders included.',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Brain,
    title: 'Call Intelligence',
    description: 'Every call is transcribed, summarized, and scored for sentiment. Searchable transcripts, recordings, and intent detection across all conversations.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Car,
    title: 'Vehicle Intelligence',
    description: 'VIN decoding, manufacturer recall checking, and mileage-based maintenance recommendations. Know what each vehicle needs before the customer asks.',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: HeartPulse,
    title: 'Customer Health Scoring',
    description: 'RFM-based health scores track recency, frequency, and spend. Identify at-risk customers and get AI-powered recommendations to re-engage them.',
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Real-time dashboards for conversion rates, revenue, sentiment trends, bay utilization, peak call hours, and AI-generated business insights.',
    color: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Users,
    title: 'Full CRM',
    description: 'Complete customer profiles with multiple vehicles, service history, call and SMS logs, appointment timeline, and lifetime value tracking.',
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'API key authentication, CORS protection, input validation, PII scrubbing in logs, rate limiting, and parameterized queries throughout.',
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
  { text: 'Book, reschedule & cancel appointments', icon: Calendar },
  { text: 'VIN decoding & recall checking', icon: FileSearch },
  { text: 'Two-way SMS (CONFIRM / CANCEL / RESCHEDULE)', icon: Smartphone },
  { text: 'Service quotes & mileage recommendations', icon: Wrench },
  { text: 'Tow request scheduling', icon: Truck },
  { text: 'Call transcripts with sentiment analysis', icon: Brain },
  { text: 'Automated reminders & confirmations', icon: Bell },
  { text: 'Multi-vehicle customer support', icon: Car },
]

const testimonials = [
  {
    quote: "Nucleus gives us peace of mind and time freedom. We never miss a call anymore — Amber handles everything while we focus on the shop floor.",
    author: "Nikita Nathwani",
    role: "9Round Owner",
    rating: 5,
  },
  {
    quote: "I've tried six or seven AI receptionist services. They're not as good at carrying on a conversation as Nucleus AI. The difference is night and day.",
    author: "Richard M Sedler",
    role: "President & CEO, RMS Media Group Inc.",
    rating: 5,
  },
]

const faqs = [
  {
    question: 'What is Premier Auto Service?',
    answer: 'Premier Auto Service is an AI-powered auto service booking platform that allows customers to book appointments 24/7 through an intelligent AI voice assistant named Amber. The platform is powered by Nucleus AI and offers services including oil changes, brake service, tire service, engine diagnostics, and more.',
  },
  {
    question: 'How do I book an appointment with Premier Auto Service?',
    answer: 'You can book an appointment by calling (647) 371-1990 anytime, 24 hours a day, 7 days a week. Our AI assistant Amber will help you schedule your service, check availability, and send you an SMS confirmation. You can also visit premierauto.ai to access the dashboard.',
  },
  {
    question: 'What services does Premier Auto Service offer?',
    answer: 'Premier Auto Service offers a full range of automotive maintenance and repair services including oil changes, brake inspection and repair, tire rotation and replacement, engine diagnostics, transmission service, air conditioning repair, battery replacement, and scheduled maintenance.',
  },
  {
    question: 'Is the AI booking system available 24/7?',
    answer: 'Yes! Our AI assistant Amber is available 24 hours a day, 7 days a week, 365 days a year. You can call anytime to book, reschedule, or cancel appointments. There are no wait times and you\'ll receive instant SMS confirmation.',
  },
  {
    question: 'What is Nucleus AI?',
    answer: 'Nucleus AI is the technology company that powers Premier Auto Service\'s AI booking system. Nucleus provides enterprise-ready conversational AI for automated phone calls, enabling businesses to offer 24/7 customer service through natural, human-like AI conversations.',
  },
]

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '' })
  const [leadStatus, setLeadStatus] = useState('idle') // idle | submitting | success | error
  const [leadError, setLeadError] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  async function handleLeadSubmit(e) {
    e.preventDefault()
    setLeadStatus('submitting')
    setLeadError('')
    try {
      await leads.submit(leadForm)
      setLeadStatus('success')
    } catch (err) {
      setLeadError(err.message || 'Something went wrong. Please try again.')
      setLeadStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-white" itemScope itemType="https://schema.org/AutoRepair">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src="/logo-light.png" alt="Premier Auto Service" className="h-20 scale-[1.3] origin-left" />
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
              <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Testimonials</a>
              <a href="tel:+16473711990" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                <Phone className="h-4 w-4" />
                (647) 371-1990
              </a>
            </div>

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

            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600">How It Works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600">FAQ</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-slate-600">Testimonials</a>
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

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
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
                Meet Amber — your AI voice agent who books appointments, checks recalls,
                recommends services by mileage, and delights customers around the clock.
                Never miss another call.
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

              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500 flex-wrap">
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

            {/* Dashboard preview */}
            <div className="relative" role="img" aria-label="Premier Auto Service dashboard showing today's schedule, AI agent status, and key metrics like 24/7 availability, 95% booking rate, and under 3 second response time">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
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
                        {[
                          { time: '9:00', service: 'Oil Change', status: 'Confirmed' },
                          { time: '10:30', service: 'Brake Inspection', status: 'Checked In' },
                          { time: '1:00', service: 'Tire Rotation', status: 'Scheduled' },
                        ].map((apt, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
                            <div className="h-8 w-12 bg-slate-600 rounded text-center py-1">
                              <span className="text-xs font-bold text-white">{apt.time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-300 truncate">{apt.service}</div>
                            </div>
                            <div className="h-5 w-16 bg-emerald-500/20 rounded text-[10px] text-emerald-400 flex items-center justify-center shrink-0">
                              {apt.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-medium text-white">AI Agent</span>
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
                          <span>Conversion</span>
                          <span className="text-emerald-400 font-medium">95%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-slate-200 animate-float hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Appointment Booked!</p>
                    <p className="text-xs text-slate-500">Oil change - Tomorrow 9 AM</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-slate-200 animate-float-delayed hidden sm:block">
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

      {/* Stats */}
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

      {/* Features */}
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
              From AI voice booking to VIN decoding and customer health scores —
              a complete platform built for modern auto service centers.
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

      {/* How It Works */}
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
              and always available. She looks up customer records, checks vehicle recalls,
              and books appointments in real time.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Capabilities */}
            <div>
              <h3 className="text-2xl font-semibold mb-6">What Amber Can Do</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
                    <cap.icon className="h-5 w-5 text-blue-400 shrink-0" />
                    <span className="text-slate-300 text-sm">{cap.text}</span>
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
                      She remembers returning customers, pulls up their vehicle info,
                      and recommends services based on mileage — all in real time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversation demo */}
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
                <ChatBubble agent>
                  "Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?"
                </ChatBubble>

                <ChatBubble>
                  "Hi, I need to schedule an oil change for my Honda Civic."
                </ChatBubble>

                <ChatBubble agent>
                  "I'd be happy to help! I see you're a returning customer — welcome back! I have your 2021 Honda Civic on file with 47,000 miles. At that mileage, I'd also recommend a tire rotation. Would you like to add that?"
                </ChatBubble>

                <ChatBubble>
                  "Sure, let's do both. What do you have available?"
                </ChatBubble>

                <ChatBubble agent>
                  "I have tomorrow at 9 AM or Thursday at 2 PM. The oil change and tire rotation will take about 45 minutes and runs $89.99. Which time works better?"
                </ChatBubble>

                <ChatBubble>
                  "Tomorrow at 9 works great!"
                </ChatBubble>

                <ChatBubble agent>
                  "You're all set for tomorrow at 9 AM! I'll send you a confirmation text right now. Is there anything else I can help with?"
                </ChatBubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Full Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              More Than Just a Phone Agent
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Amber is backed by a complete management platform — scheduling, CRM,
              analytics, and reporting, all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-5">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Real-Time Analytics</h3>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Conversion rate & revenue tracking</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Customer sentiment trends</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Peak call hours heatmap</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Bay utilization metrics</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />AI-generated business insights</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mb-5">
                <Wrench className="h-6 w-6 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Shop Management</h3>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Bay & technician scheduling</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Skill-based technician assignment</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />40+ pre-loaded service catalog</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Atomic booking (no double-books)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Loaner & shuttle request tracking</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-5">
                <FileSearch className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Reports & Export</h3>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Customer & appointment reports</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Call log export with transcripts</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />SMS history export</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />Summary reports with KPIs</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />CSV export for all data</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA + Lead Capture */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-20 items-center">
            {/* Left — copy */}
            <div className="lg:col-span-3">
              <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10 border-white/20">
                Get Started
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Ready to Transform Your Auto Shop?
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-xl">
                AI voice booking, vehicle intelligence, customer health scoring,
                and a full management dashboard — all in one platform.
              </p>
              <div className="space-y-4">
                {[
                  'Personalized demo of the full platform',
                  'Custom setup for your shop\'s services and hours',
                  'Live in as little as 48 hours',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <span>Or reach us directly:</span>
                <a href="tel:+16473711990" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                  (647) 371-1990
                </a>
                <a href="mailto:service@premierauto.ai" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  service@premierauto.ai
                </a>
              </div>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-2">
              {leadStatus === 'success' ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Thanks for reaching out!</h3>
                  <p className="text-slate-400">We'll be in touch shortly to schedule your demo.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
                  <h3 className="text-lg font-semibold mb-6">Request a Demo</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="lead-name" className="block text-sm font-medium text-slate-400 mb-1.5">Name</label>
                      <input
                        id="lead-name"
                        type="text"
                        placeholder="John Smith"
                        required
                        value={leadForm.name}
                        onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="lead-email" className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                      <input
                        id="lead-email"
                        type="email"
                        placeholder="john@yourshop.com"
                        required
                        value={leadForm.email}
                        onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="lead-phone" className="block text-sm font-medium text-slate-400 mb-1.5">Phone <span className="text-slate-500 font-normal">(optional)</span></label>
                      <input
                        id="lead-phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={leadForm.phone}
                        onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {leadError && (
                    <p className="mt-3 text-sm text-red-400">{leadError}</p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={leadStatus === 'submitting'}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white h-12"
                  >
                    {leadStatus === 'submitting' ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      <>Request a Demo</>
                    )}
                  </Button>

                  <p className="mt-4 text-xs text-slate-500 text-center">
                    We'll reach out within one business day.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to know about Premier Auto Service and our AI booking platform.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-lg font-medium text-slate-900 pr-4">{faq.question}</span>
                  <ChevronDown className={cn(
                    "h-5 w-5 text-slate-500 shrink-0 transition-transform duration-200",
                    openFaq === i && "rotate-180"
                  )} />
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-slate-600 leading-relaxed">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
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
                    {testimonial.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
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

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-white tracking-tight">PREMIER AUTO</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                AI-powered auto service booking platform. Available 24/7 to help you
                schedule appointments, answer questions, and keep your vehicle running smoothly.
              </p>
              <div className="flex items-center gap-6">
                <a href="tel:+17164122499" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors text-sm">
                  <Phone className="h-4 w-4" />
                  (716) 412-2499
                </a>
                <a href="tel:+16473711990" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors text-sm">
                  <Phone className="h-4 w-4" />
                  (647) 371-1990
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  (647) 371-1990
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  service@premierauto.ai
                </li>
                <li className="flex items-start gap-2">
                  <Car className="h-4 w-4 mt-0.5 shrink-0" />
                  1250 Industrial Boulevard<br />Springfield
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Premier Auto Service. All rights reserved.
            </p>
            <a
              href="https://nucleus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              Powered by
              <img src="/nucleus-logo.svg" alt="Nucleus" className="h-3.5 brightness-0 invert opacity-70" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ChatBubble({ agent, children }) {
  if (agent) {
    return (
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-violet-400" />
        </div>
        <div className="bg-violet-500/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm text-slate-200">{children}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 justify-end">
      <div className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
        <p className="text-sm text-white">{children}</p>
      </div>
      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-blue-400" />
      </div>
    </div>
  )
}
