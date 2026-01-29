"use client"

import Link from "next/link"
import { Sparkles, Github, Twitter, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-panel border-t border-border-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accentBlue via-accentPurple to-accentPink flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-bg0" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-accentBlue via-accentPurple to-accentPink bg-clip-text text-transparent">
                ArgusOS
              </span>
            </Link>
            <p className="text-text2 text-sm">
              Your intelligent email and calendar assistant. Stay organized, stay productive.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-text0 font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="text-text2 hover:text-text0 text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="text-text2 hover:text-text0 text-sm transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-text2 hover:text-text0 text-sm transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-text0 font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="text-text2 hover:text-text0 text-sm transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/api" className="text-text2 hover:text-text0 text-sm transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-text2 hover:text-text0 text-sm transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-text0 font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 hover:text-accentBlue transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 hover:text-accentPurple transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:support@argusos.com"
                className="text-text2 hover:text-accentPink transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border-0 flex flex-col md:flex-row justify-between items-center">
          <p className="text-text2 text-sm">
            © {new Date().getFullYear()} ArgusOS. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-text2 hover:text-text0 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-text2 hover:text-text0 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
