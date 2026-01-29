"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Menu, X } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg0/80 backdrop-blur-lg border-b border-border-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accentBlue via-accentPurple to-accentPink flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-bg0" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accentBlue via-accentPurple to-accentPink bg-clip-text text-transparent">
              ArgusOS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-text1 hover:text-text0 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-text1 hover:text-text0 transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-text1 hover:text-text0 transition-colors">
              Pricing
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-text1 hover:text-text0">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-accentBlue hover:bg-accentBlue/90 text-bg0">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-text0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border-0">
            <Link
              href="#features"
              className="block text-text1 hover:text-text0 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block text-text1 hover:text-text0 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="block text-text1 hover:text-text0 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-border-0 text-text0">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-accentBlue hover:bg-accentBlue/90 text-bg0">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
