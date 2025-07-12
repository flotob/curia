"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Copy, 
  Check, 
  Code, 
  Palette, 
  Monitor,
  Smartphone,
  Laptop
} from "lucide-react"

const codeExamples = {
  basic: {
    title: "Basic Integration",
    description: "Minimal setup for any website",
    code: `<!-- Add to your website -->
<div id="my-forum"></div>
<script 
  src="https://curia.host/embed.js"
  data-community="my-community"
  data-theme="light"
  async>
</script>`
  },
  customized: {
    title: "Customized Setup",
    description: "With custom height and theme",
    code: `<!-- Customized configuration -->
<div id="community-forum"></div>
<script 
  src="https://curia.host/embed.js"
  data-container="community-forum"
  data-community="my-dao"
  data-theme="dark"
  data-height="800px"
  async>
</script>`
  },
  react: {
    title: "React Integration",
    description: "Using in React applications",
    code: `// React component
import { useEffect } from 'react';

export function CommunityForum() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://curia.host/embed.js';
    script.setAttribute('data-community', 'my-dao');
    script.setAttribute('data-theme', 'light');
    script.async = true;
    document.head.appendChild(script);
    
    return () => script.remove();
  }, []);

  return <div id="forum-container" />;
}`
  }
}

export function CodeExample() {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>('basic')
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeExamples[activeTab].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Description */}
          <div className="space-y-8">
            <div className="space-y-6">
              <Badge className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                <Code className="w-4 h-4" />
                Integration
              </Badge>
              
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Deploy in{" "}
                <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  seconds
                </span>
              </h2>
              
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                Copy and paste one script tag to add complete Web3 forum functionality 
                to any website. No build step, no backend setup, no complex configuration.
              </p>
            </div>
            
            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Framework agnostic - works with any website
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Auto-responsive design adapts to your layout
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Secure iframe isolation with PostMessage API
                </span>
              </div>
            </div>
            
            {/* Device Preview */}
            <div className="flex items-center gap-4 pt-4">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Works everywhere:
              </span>
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-slate-400" />
                <Monitor className="w-5 h-5 text-slate-400" />
                <Smartphone className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
          
          {/* Right Column - Code Examples */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(codeExamples).map(([key, example]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as keyof typeof codeExamples)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {example.title}
                </button>
              ))}
            </div>
            
            {/* Code Block */}
            <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                      {codeExamples[activeTab].title}
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {codeExamples[activeTab].description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="ml-2 text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="ml-2">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="bg-slate-900 dark:bg-slate-950 text-green-400 font-mono text-sm overflow-x-auto">
                  <pre className="p-6 whitespace-pre-wrap">
                    <code>{codeExamples[activeTab].code}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">10KB</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Bundle Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">&lt;100ms</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Load Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Dependencies</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 