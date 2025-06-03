'use client';

import { MiniPresenceWidget } from '@/components/presence/MiniPresenceWidget';

export default function TestMiniPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Mini Presence Widget Test</h1>
          <p className="text-muted-foreground">
            Testing the 200x200px mini mode for Common Ground minimized state
          </p>
        </div>

        {/* Test containers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Exact 200x200 test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Exact 200x200px</h2>
            <div className="w-[200px] h-[200px] border-2 border-red-500 bg-background">
              <MiniPresenceWidget onExpand={() => console.log('Expand requested!')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Exact Common Ground mini size with red border
            </p>
          </div>

          {/* Slightly larger test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">250x250px</h2>
            <div className="w-[250px] h-[250px] border-2 border-blue-500 bg-background">
              <MiniPresenceWidget onExpand={() => console.log('Expand requested!')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Just above mini threshold (should still be mini mode)
            </p>
          </div>

          {/* Rectangular test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">200x300px</h2>
            <div className="w-[200px] h-[300px] border-2 border-green-500 bg-background">
              <MiniPresenceWidget onExpand={() => console.log('Expand requested!')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Narrow but tall - still mini mode
            </p>
          </div>

          {/* Dark mode test */}
          <div className="space-y-4 dark">
            <h2 className="text-xl font-semibold">Dark Mode 200x200px</h2>
            <div className="w-[200px] h-[200px] border-2 border-purple-500 bg-background">
              <MiniPresenceWidget onExpand={() => console.log('Expand requested!')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Dark theme test
            </p>
          </div>

          {/* Scrolling test with many items */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Scrolling Test</h2>
            <div className="w-[200px] h-[200px] border-2 border-orange-500 bg-background">
              <MiniPresenceWidget onExpand={() => console.log('Expand requested!')} />
            </div>
            <p className="text-xs text-muted-foreground">
              Tests scrolling with many users (if any online)
            </p>
          </div>

          {/* Interaction test */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Interaction Test</h2>
            <div className="w-[200px] h-[200px] border-2 border-pink-500 bg-background relative group">
              <MiniPresenceWidget onExpand={() => {
                alert('Expand functionality triggered!');
              }} />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-center text-xs text-gray-600 mt-2">Hover to test interactions</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tests hover states and click interactions
            </p>
          </div>
        </div>

        {/* Real-time simulation instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Testing Instructions:</h3>
          <ul className="space-y-2 text-sm">
            <li>• Open multiple browser tabs/windows to simulate multiple users</li>
            <li>• Navigate to different boards to see activity indicators</li>
            <li>• Try clicking on user avatars to test navigation</li>
            <li>• Click the header to test expand functionality</li>
            <li>• Test on different screen sizes to verify mini mode detection</li>
            <li>• Check scrolling behavior when many users are online</li>
          </ul>
        </div>

        {/* Browser resize test */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Browser Resize Test:</h3>
          <p className="text-sm mb-4">
            You can resize your browser window to &lt;= 250x250px to trigger actual mini mode in the main app.
          </p>
          <button 
            onClick={() => {
              window.resizeTo(250, 250);
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm"
          >
            Resize Window to 250x250px (Desktop only)
          </button>
        </div>
      </div>
    </div>
  );
} 