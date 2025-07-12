"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  ExternalLink, 
  Lightbulb,
  Palette,
  Users,
  MessageSquare
} from "lucide-react"

export function LiveDemo() {
  const [isExpanded, setIsExpanded] = useState(false)
  
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
        
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Demo Preview */}
          <div className="space-y-6">
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
                {isExpanded ? (
                  <div className="h-96 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-white" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          Demo Forum Loading...
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          This would show the actual embed
                        </p>
                      </div>
                      <Button 
                        onClick={() => window.open('/demo', '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Full Demo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border-t">
                    <Button 
                      onClick={() => setIsExpanded(true)}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Start Interactive Demo
                    </Button>
                  </div>
                )}
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
          <div className="space-y-8">
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
            
            {/* Demo Stats */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
              <CardContent className="p-6">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                  Demo Capabilities
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Auth Methods</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">Live</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Real-time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">Web3</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Native</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">0ms</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Setup Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
} 