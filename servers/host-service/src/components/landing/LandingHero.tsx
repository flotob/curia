"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoModal } from "./DemoModal"
import { ArrowRight, Zap, Shield, Globe, Play } from "lucide-react"

export function LandingHero() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:20px_20px]" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <Badge className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                <Zap className="w-4 h-4" />
                Production Ready
              </Badge>
              
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Embed{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Web3 Forums
                  </span>{" "}
                  in Minutes
                </h1>
                
                <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  Add sophisticated blockchain-based community features to any website with a single script tag. 
                  Universal Profile authentication, token gating, and real-time forums—no backend required.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="group text-base px-8 py-6 bg-blue-600 hover:bg-blue-700">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base px-8 py-6"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Try Live Demo
                </Button>
              </div>
              
              {/* Key Features */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Blockchain Auth</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">One Script Tag</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Globe className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium">Works Anywhere</span>
                </div>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="relative">
              <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 shadow-2xl">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      // Add to any website
                    </div>
                    <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                      <div>{`<div id="my-forum"></div>`}</div>
                      <div className="mt-2">{`<script src="https://curia.host/embed.js"`}</div>
                      <div className="ml-8">{`data-community="my-dao"`}</div>
                      <div className="ml-8">{`data-theme="light"`}</div>
                      <div className="ml-8">{`async>`}</div>
                      <div>{`</script>`}</div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Ready to deploy • 10KB • Zero dependencies</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl opacity-30 animate-pulse delay-1000"></div>
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