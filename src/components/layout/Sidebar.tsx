'use client';

import Link from 'next/link';
import Image from 'next/image'; // For Next.js optimized images
import { Home, Bug, LayoutDashboard, Settings } from 'lucide-react'; // Added LayoutDashboard for generic board icon and Settings for admin-only debug link
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'; // Correct import
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // For admin-only debug link
import { Button } from '@/components/ui/button';

interface SidebarProps {
  communityInfo: CommunityInfoResponsePayload | null; // Or your specific type for community data
  boardsList: ApiBoard[] | null;
  // currentBoardId?: string | number; // For highlighting active board, TBD in WP1.4
}

// Test comment to trigger re-parse after library update
export const Sidebar: React.FC<SidebarProps> = ({ communityInfo, boardsList }) => {
  const { user } = useAuth(); // Get user for admin check for debug link
  
  if (!communityInfo) { // boardsList can be empty, but communityInfo is essential for branding
    return (
      <aside className="w-64 bg-slate-100 dark:bg-slate-800 p-4 border-r border-border h-screen sticky top-0 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading community data...</p>
      </aside>
    );
  }
  
  const headerStyle = communityInfo.headerImageUrl
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${communityInfo.headerImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor: 'hsl(var(--muted))' }; // Fallback background if no header image

  return (
    <aside className="w-64 bg-background dark:bg-slate-900 flex flex-col h-screen sticky top-0 border-r border-border">
      {/* Branding Section */}
      <div 
        className="relative p-4 pt-5 pb-4 border-b border-border group/branding"
        style={headerStyle}
      >
        {/* <div className='absolute inset-0 bg-black/30 group-hover/branding:bg-black/20 transition-colors duration-200' /> */} {/* Optional darker overlay on hover */}
        <div className="relative z-10 flex items-center space-x-3 mb-1">
          {communityInfo.smallLogoUrl && (
            <Image 
              src={communityInfo.smallLogoUrl} 
              alt={`${communityInfo.title} logo`} 
              width={36} 
              height={36} 
              className="rounded-md border border-slate-700/50 bg-white/10 p-0.5"
            />
          )}
          <h1 className="text-lg font-semibold text-white break-words leading-tight">
            {communityInfo.title}
          </h1>
        </div>
        {/* Can add more info here like member count or a short tagline if available and desired */}
      </div>

      {/* Navigation Section */}
      <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
        <Link 
            href={`/?communityId=${communityInfo.id}`} // Link to main feed, perhaps ensuring community context if needed by feed page
            className={cn(
                "flex items-center py-2 px-2.5 rounded-md text-sm font-medium transition-colors",
                // TODO: Add active state based on current path/board
                "hover:bg-muted hover:text-accent-foreground text-muted-foreground"
            )}
        >
            <Home size={16} className="mr-2.5 flex-shrink-0" />
            Home / All Posts
        </Link>

        {boardsList && boardsList.length > 0 && (
          <p className="text-xs text-muted-foreground px-2.5 pt-3 pb-1 font-semibold uppercase tracking-wider">
            Boards
          </p>
        )}
        {boardsList ? (
          boardsList.length > 0 ? (
            boardsList.map(board => (
              <Link 
                key={board.id} 
                href={`/?communityId=${communityInfo.id}&boardId=${board.id}`} // Example path, adjust as needed
                className={cn(
                    "flex items-center py-2 px-2.5 rounded-md text-sm font-medium transition-colors group/boardlink",
                    // TODO: Add active state based on current path/board (e.g., if currentBoardId === board.id)
                    "hover:bg-muted hover:text-accent-foreground text-muted-foreground"
                )}
              >
                <LayoutDashboard size={16} className="mr-2.5 flex-shrink-0 text-muted-foreground group-hover/boardlink:text-accent-foreground" /> 
                <span className="truncate">{board.name}</span>
              </Link>
            ))
          ) : (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">No boards yet.</p>
          )
        ) : (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">Loading boards...</p> // Loading state for boards
        )}

        {/* Utility Links - Only show Debug if user is an admin */}
        {(user?.isAdmin || user?.userId === process.env.NEXT_PUBLIC_SUPERADMIN_ID) && (
          <>
            <hr className="my-3"/>
            <Link href="/debug" className={cn(
                "flex items-center py-2 px-2.5 rounded-md text-sm font-medium transition-colors",
                "hover:bg-muted hover:text-accent-foreground text-muted-foreground"
                )}
            >
              <Bug size={16} className="mr-2.5 flex-shrink-0" />
              Debug
            </Link>
          </>
        )}
      </nav>
      
      {/* Footer for Pin/Collapse - WP1.5 */}
      <div className="p-2 border-t border-border mt-auto">
        {/* Placeholder for pin button */}
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <Settings size={16} className="mr-2.5" /> Settings (placeholder)
        </Button>
      </div>
    </aside>
  );
}; 