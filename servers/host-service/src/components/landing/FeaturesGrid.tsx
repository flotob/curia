"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DemoModal } from "./DemoModal"
import { 
  Wallet, 
  Users, 
  Zap, 
  Shield, 
  Globe, 
  Code, 
  MessageSquare, 
  Settings,
  Sparkles,
  Play
} from "lucide-react"

const features = [
  {
    icon: Wallet,
    title: "Multi-Identity Authentication",
    description: "Support for Universal Profile (LUKSO), ENS domains, and anonymous users. Seamless wallet connection with automatic profile fetching.",
    category: "Authentication",
    highlights: ["Universal Profile", "ENS Domains", "Anonymous Mode"]
  },
  {
    icon: Shield,
    title: "Token Gating & Verification",
    description: "Sophisticated requirement checking for ERC-20, ERC-721, ERC-1155, LSP7, and LSP8 tokens. Create exclusive communities based on token ownership.",
    category: "Security",
    highlights: ["Multi-Token Support", "Real-time Verification", "Custom Requirements"]
  },
  {
    icon: Code,
    title: "One Script Integration",
    description: "Deploy complete forum functionality with a single script tag. No backend setup, no complex configuration—just copy, paste, and go.",
    category: "Integration",
    highlights: ["Zero Dependencies", "10KB Bundle", "Instant Deploy"]
  },
  {
    icon: MessageSquare,
    title: "Real-time Communities",
    description: "Full-featured forums with posts, comments, reactions, and real-time updates. Rich text editing and media support included.",
    category: "Features",
    highlights: ["Live Updates", "Rich Content", "Threaded Discussions"]
  },
  {
    icon: Globe,
    title: "Universal Compatibility",
    description: "Works on any website—React, Vue, vanilla HTML, or any framework. Responsive design adapts to your site's layout automatically.",
    category: "Compatibility",
    highlights: ["Framework Agnostic", "Mobile Responsive", "Auto-sizing"]
  },
  {
    icon: Settings,
    title: "Powerful Customization",
    description: "Theme support, custom branding, configurable permissions, and extensive API access. Make it feel native to your platform.",
    category: "Customization",
    highlights: ["Theme System", "API Access", "White-label Ready"]
  }
]

export function FeaturesGrid() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <section className="py-20 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-6 mb-16">
          <Badge className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
            <Sparkles className="w-4 h-4" />
            Platform Features
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Everything you need for{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Web3 communities
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
            From blockchain authentication to real-time forums, Curia provides enterprise-grade 
            community features that integrate seamlessly into any website.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                      {feature.category}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <CardDescription className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      >
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Ready to add Web3 community features to your website?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Play className="w-5 h-5" />
              Try Live Demo
            </button>
            <a 
              href="/demo" 
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              <Globe className="w-5 h-5" />
              Full Page Demo
            </a>
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