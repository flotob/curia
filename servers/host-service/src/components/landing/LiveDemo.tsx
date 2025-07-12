"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DemoModal } from "./DemoModal"
import { 
  Play, 
  ExternalLink, 
  Lightbulb,
  Palette,
  Users,
  MessageSquare
} from "lucide-react"

export function LiveDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const embedRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    if (embedRef.current) {
      // Load the embed script immediately
      const script = document.createElement('script')
      script.src = '/embed.js'
      script.async = true
      script.setAttribute('data-container', 'curia-live-demo')
      script.setAttribute('data-community', 'test-community')
      script.setAttribute('data-theme', 'light')
      script.setAttribute('data-height', '500px')
      
      document.head.appendChild(script)
      scriptRef.current = script
    }

    return () => {
      // Cleanup when component unmounts
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
  }, [])
  
  return (
    <section className="py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-6 mb-16">
          <Badge className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            <Play className="w-4 h-4" />
            Live Demo
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            See it{" "}
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              in action
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            Experience the complete Web3 forum functionality running live. 
            Connect your wallet, test authentication, and interact with the community features.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-12 items-start">
          {/* Demo Preview */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                    Interactive Demo
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="h-[500px] bg-white dark:bg-slate-800 p-4">
                  <div 
                    id="curia-live-demo"
                    ref={embedRef}
                    className="h-full border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => window.open('/demo', '_blank')}
                variant="outline" 
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Full Page Demo
              </Button>
              <Button 
                onClick={() => window.open('#documentation', '_self')}
                variant="outline" 
                className="flex-1"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Integration Guide
              </Button>
            </div>
          </div>
          
          {/* Demo Features */}
          <div className="space-y-8 lg:col-span-1">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                What you'll experience
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      Multi-Identity Authentication
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                      Connect with Universal Profile, ENS domain, or browse anonymously. 
                      See real blockchain profile data integration.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      Full Forum Experience
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                      Create posts, comment, react, and experience real-time updates. 
                      All running inside a simple iframe embed.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      Responsive Design
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                      Test how the embed adapts to different screen sizes and 
                      integrates seamlessly with your site's design.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            

          </div>
        </div>
      </div>

      {/* Demo Modal */}
      <DemoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  )
} 