'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Image, Share2 } from 'lucide-react';

export default function TestMetaPage() {
  // Sample post IDs for testing (replace with actual post IDs from your database)
  const testPosts = [
    { id: 1, boardId: 1, title: 'Test Post 1' },
    { id: 2, boardId: 1, title: 'Test Post 2' },
    { id: 3, boardId: 2, title: 'Test Post 3' },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share2 className="mr-2" />
              Meta Tags & OG Image Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Test Your Share Links</h3>
              <p className="text-muted-foreground mb-4">
                Use these tools to test how your forum posts will look when shared on social media:
              </p>
              
              <div className="grid gap-4">
                <div>
                  <h4 className="font-medium mb-2">🔗 Test Post Links</h4>
                  <div className="space-y-2">
                    {testPosts.map((post) => (
                      <div key={post.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <span className="font-mono text-sm">Post #{post.id}</span>
                        <Link
                          href={`/board/${post.boardId}/post/${post.id}`}
                          className="text-primary hover:underline"
                        >
                          {post.title}
                        </Link>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`/board/${post.boardId}/post/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={16} className="mr-2" />
                            Open
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">🖼️ Test OG Images</h4>
                  <div className="space-y-2">
                    {testPosts.map((post) => (
                      <div key={`og-${post.id}`} className="flex items-center gap-4 p-3 border rounded-lg">
                        <span className="font-mono text-sm">OG Image #{post.id}</span>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`/api/og-image?title=${encodeURIComponent(post.title)}&author=Test%20Author&board=Test%20Board&id=${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Image size={16} className="mr-2" />
                            View Image
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">🔍 Test Metadata API</h4>
                  <div className="space-y-2">
                    {testPosts.map((post) => (
                      <div key={`meta-${post.id}`} className="flex items-center gap-4 p-3 border rounded-lg">
                        <span className="font-mono text-sm">Metadata #{post.id}</span>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`/api/posts/${post.id}/metadata`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink size={16} className="mr-2" />
                            View JSON
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Social Media Testing Tools</h3>
              <p className="text-muted-foreground mb-4">
                Use these external tools to validate how your meta tags appear on different platforms:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" asChild>
                  <a 
                    href="https://developers.facebook.com/tools/debug/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Facebook Sharing Debugger
                  </a>
                </Button>
                
                <Button variant="outline" asChild>
                  <a 
                    href="https://cards-dev.twitter.com/validator"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Twitter Card Validator
                  </a>
                </Button>
                
                <Button variant="outline" asChild>
                  <a 
                    href="https://www.linkedin.com/post-inspector/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    LinkedIn Post Inspector
                  </a>
                </Button>
                
                <Button variant="outline" asChild>
                  <a 
                    href="https://metatags.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Meta Tags Checker
                  </a>
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Telegram Testing</h3>
              <p className="text-muted-foreground mb-2">
                For Telegram, send a message to <code className="bg-muted px-2 py-1 rounded">@WebPageBot</code> with your post URL to test link previews.
              </p>
              <p className="text-sm text-muted-foreground">
                Example: Send your post URL to the bot and it will show you how the preview will look in Telegram.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 