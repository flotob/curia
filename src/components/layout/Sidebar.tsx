'use client';

import Link from 'next/link';
import { Home, Bug } from 'lucide-react'; // Or other icons you prefer

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-100 dark:bg-slate-800 p-4 space-y-4 border-r border-border h-screen sticky top-0">
      <h2 className="text-xl font-semibold mb-6">Navigation</h2>
      <nav>
        <ul>
          <li>
            <Link href="/" className="flex items-center p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground">
              <Home size={20} className="mr-3" />
              Feed
            </Link>
          </li>
          <li>
            <Link href="/debug" className="flex items-center p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground">
              <Bug size={20} className="mr-3" />
              Debug
            </Link>
          </li>
          {/* Add more links here as needed */}
        </ul>
      </nav>
    </aside>
  );
}; 