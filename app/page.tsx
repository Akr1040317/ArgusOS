"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/landing/Navbar"
import { Footer } from "@/components/landing/Footer"
import {
  Sparkles,
  Inbox,
  Calendar,
  Zap,
  Brain,
  Shield,
  Clock,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Mail,
  FileText,
  Command,
  TrendingUp,
  Users,
  Bell,
  Search,
  Layers,
  BarChart3,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg0 text-text0">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accentBlue/10 border border-accentBlue/20 text-accentBlue text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Email Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-accentBlue via-accentPurple to-accentPink bg-clip-text text-transparent">
                Your Email & Calendar
              </span>
              <br />
              <span className="text-text0">Agent Dashboard</span>
            </h1>
            <p className="text-xl md:text-2xl text-text1 max-w-3xl mx-auto">
              Superhuman-like productivity with AI-powered triage, instant draft replies, and intelligent meeting prep. 
              Never miss an important email again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-accentBlue hover:bg-accentBlue/90 text-bg0 text-lg px-8 py-6">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-accentPurple text-accentPurple hover:bg-accentPurple/10 text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-bg1">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-text1 max-w-2xl mx-auto">
              Everything you need to master your inbox and calendar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI-Powered Triage */}
            <Card className="bg-panel border-border-0 hover:border-accentBlue/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentBlue/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-accentBlue" />
                </div>
                <CardTitle className="text-text0">AI-Powered Triage</CardTitle>
                <CardDescription className="text-text1">
                  Automatically classify, prioritize, and categorize your emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Smart priority scoring (P0/P1/P2)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Automatic categorization (VIP, Finance, Hiring, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Importance scoring with explainable reasons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Status detection (Needs Reply, Waiting, FYI)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Instant Draft Replies */}
            <Card className="bg-panel border-border-0 hover:border-accentPurple/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPurple/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-accentPurple" />
                </div>
                <CardTitle className="text-text0">Instant Draft Replies</CardTitle>
                <CardDescription className="text-text1">
                  Pre-computed replies ready when you open important emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Drafts generated instantly for important emails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Multiple tone options (concise, warm, assertive, formal)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>One-click regenerate and customize</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Learns your writing style and preferences</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Meeting Prep Packs */}
            <Card className="bg-panel border-border-0 hover:border-accentPink/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPink/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-accentPink" />
                </div>
                <CardTitle className="text-text0">Meeting Prep Packs</CardTitle>
                <CardDescription className="text-text1">
                  AI-generated context summaries for your upcoming meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Context summaries from related email threads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Open loops and action items identified</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Suggested agenda items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Automatic thread-to-meeting linking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Real-Time Inbox Sync */}
            <Card className="bg-panel border-border-0 hover:border-accentBlue/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentBlue/10 flex items-center justify-center mb-4">
                  <Inbox className="h-6 w-6 text-accentBlue" />
                </div>
                <CardTitle className="text-text0">Real-Time Inbox Sync</CardTitle>
                <CardDescription className="text-text1">
                  Gmail integration with instant email processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Gmail Watch API for instant notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>New emails appear within 1-2 minutes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>3-pane Superhuman-like interface</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Smart splits and filters</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Hourly Digests */}
            <Card className="bg-panel border-border-0 hover:border-accentPurple/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPurple/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-accentPurple" />
                </div>
                <CardTitle className="text-text0">Hourly Digests</CardTitle>
                <CardDescription className="text-text1">
                  Automated summaries of what needs your attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Important new emails highlighted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Overdue replies flagged by priority</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Follow-ups due notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Upcoming meetings with prep status</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card className="bg-panel border-border-0 hover:border-accentPink/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPink/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-accentPink" />
                </div>
                <CardTitle className="text-text0">Chat Interface</CardTitle>
                <CardDescription className="text-text1">
                  ChatGPT-style interface to query your inbox and calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Ask &quot;What did I miss today?&quot;</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Summarize threads by criteria</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Generate drafts for multiple emails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Meeting prep recommendations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Task Management */}
            <Card className="bg-panel border-border-0 hover:border-accentBlue/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentBlue/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-accentBlue" />
                </div>
                <CardTitle className="text-text0">Derived Tasks</CardTitle>
                <CardDescription className="text-text1">
                  Automatically extracted action items from your emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Reply tasks from inbound emails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Follow-up reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Deadline tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentBlue mt-0.5 flex-shrink-0" />
                    <span>Linked to source threads</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Keyboard-First Navigation */}
            <Card className="bg-panel border-border-0 hover:border-accentPurple/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPurple/10 flex items-center justify-center mb-4">
                  <Command className="h-6 w-6 text-accentPurple" />
                </div>
                <CardTitle className="text-text0">Keyboard-First</CardTitle>
                <CardDescription className="text-text1">
                  Superhuman-like keyboard navigation and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Cmd+K command palette</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>J/K navigation in inbox</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Global shortcuts for all tabs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPurple mt-0.5 flex-shrink-0" />
                    <span>Mouse-free productivity</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="bg-panel border-border-0 hover:border-accentPink/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accentPink/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accentPink" />
                </div>
                <CardTitle className="text-text0">Privacy & Security</CardTitle>
                <CardDescription className="text-text1">
                  Enterprise-grade security for your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>End-to-end encryption</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>OAuth tokens stored securely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>Audit logs for all actions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accentPink mt-0.5 flex-shrink-0" />
                    <span>GDPR compliant</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-text1 max-w-2xl mx-auto">
              Three simple steps to transform your email productivity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accentBlue/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-accentBlue">1</span>
              </div>
              <h3 className="text-2xl font-semibold text-text0">Connect</h3>
              <p className="text-text1">
                Connect your Gmail and Google Calendar accounts with secure OAuth. 
                We never store your passwords.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accentPurple/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-accentPurple">2</span>
              </div>
              <h3 className="text-2xl font-semibold text-text0">Automate</h3>
              <p className="text-text1">
                Our AI agent processes every email in real-time, classifying, summarizing, 
                and generating drafts automatically.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accentPink/10 flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-accentPink">3</span>
              </div>
              <h3 className="text-2xl font-semibold text-text0">Productivity</h3>
              <p className="text-text1">
                Focus on what matters. Get instant insights, ready-to-send drafts, 
                and meeting prep—all in one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-bg1">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Save <span className="text-accentBlue">10+ hours</span> per week
              </h2>
              <p className="text-xl text-text1">
                Stop drowning in your inbox. ArgusOS handles the triage, drafts, and prep work 
                so you can focus on what actually matters.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <TrendingUp className="h-6 w-6 text-accentBlue flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text0">Faster Response Times</h4>
                    <p className="text-text2">Reply to important emails in seconds, not minutes</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="h-6 w-6 text-accentPurple flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text0">Better Meeting Prep</h4>
                    <p className="text-text2">Walk into meetings fully prepared with context and action items</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Layers className="h-6 w-6 text-accentPink flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-text0">Never Miss Important</h4>
                    <p className="text-text2">AI prioritization ensures critical emails never get buried</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-panel border-border-0 p-6">
                <div className="text-4xl font-bold text-accentBlue mb-2">2min</div>
                <div className="text-text2">Average response time</div>
              </Card>
              <Card className="bg-panel border-border-0 p-6">
                <div className="text-4xl font-bold text-accentPurple mb-2">95%</div>
                <div className="text-text2">Time saved on triage</div>
              </Card>
              <Card className="bg-panel border-border-0 p-6">
                <div className="text-4xl font-bold text-accentPink mb-2">10hrs</div>
                <div className="text-text2">Saved per week</div>
              </Card>
              <Card className="bg-panel border-border-0 p-6">
                <div className="text-4xl font-bold text-accentBlue mb-2">24/7</div>
                <div className="text-text2">AI agent monitoring</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-to-br from-accentBlue/10 via-accentPurple/10 to-accentPink/10 border-accentBlue/20 p-12 text-center">
            <CardHeader>
              <CardTitle className="text-4xl font-bold mb-4">Ready to Transform Your Inbox?</CardTitle>
              <CardDescription className="text-xl text-text1">
                Join thousands of professionals who&apos;ve reclaimed their time with ArgusOS
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-accentBlue hover:bg-accentBlue/90 text-bg0 text-lg px-8 py-6">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-accentPurple text-accentPurple hover:bg-accentPurple/10 text-lg px-8 py-6">
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}
