"use client"

import { useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Zap } from 'lucide-react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const embedRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    if (isOpen && embedRef.current) {
      // Load the embed script when modal opens
      const script = document.createElement('script')
      script.src = '/embed.js'
      script.async = true
      script.setAttribute('data-container', 'curia-demo-modal')
      script.setAttribute('data-community', 'test-community')
      script.setAttribute('data-theme', 'light')
      script.setAttribute('data-height', '600px')
      
      document.head.appendChild(script)
      scriptRef.current = script
    }

    return () => {
      // Cleanup when modal closes or unmounts
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
      }
      
      // Clean up global reference
      if (window.curiaEmbed) {
        if (window.curiaEmbed.destroy) {
          window.curiaEmbed.destroy()
        }
        delete window.curiaEmbed
      }
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-6xl"
      className="mx-2 sm:mx-4"
    >
      <div className="relative">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                  <Zap className="w-4 h-4" />
                  Live Demo
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Interactive Curia Forum
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Experience the complete Web3 forum functionality. Connect your wallet and try it out!
              </p>
            </div>
            
            <Button
              onClick={() => window.open('/demo', '_blank')}
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Page
            </Button>
          </div>
        </div>

        {/* Embed Container */}
        <div className="p-3 sm:p-6 bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-3 sm:p-4 min-h-[400px] sm:min-h-[600px]">
            {/* Simulated browser bar */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="flex gap-1 sm:gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-mono overflow-hidden">
                https://your-website.com
              </div>
            </div>
            
            {/* Demo content wrapper */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 sm:p-4 min-h-[300px] sm:min-h-[500px]">
              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Welcome to Our Community
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-3 sm:mb-4">
                  Join the discussion below. This is how Curia forums look when embedded on your website.
                </p>
              </div>
              
              {/* This is where the actual embed will load */}
              <div 
                id="curia-demo-modal"
                ref={embedRef}
                className="min-h-[250px] sm:min-h-[400px] border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
              <span className="font-medium text-slate-900 dark:text-white">✨ This is a live, functional forum</span>
              <span className="hidden sm:inline"> — Connect your wallet to test authentication!</span>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => window.open('/demo', '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Try Full Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
} 