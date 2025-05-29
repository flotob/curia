'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, LayoutDashboard, Settings, ChevronRight, Plus } from 'lucide-react';
import { CommunityInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { ApiBoard } from '@/app/api/communities/[communityId]/boards/route';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { usePathname, useSearchParams } from 'next/navigation';

interface SidebarProps {
  communityInfo: CommunityInfoResponsePayload | null;
  boardsList: ApiBoard[] | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ communityInfo, boardsList }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [bgColor, setBgColor] = useState('#ffffff');

  useEffect(() => {
    setMounted(true);
    
    // Get theme from URL params
    const cgTheme = searchParams?.get('cg_theme') || 'light';
    const cgBgColor = searchParams?.get('cg_bg_color') || '#ffffff';
    
    setTheme(cgTheme as 'light' | 'dark');
    setBgColor(cgBgColor);
    
    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--cg-bg', cgBgColor);
    document.documentElement.setAttribute('data-cg-theme', cgTheme);
  }, [searchParams]);

  if (!mounted || !communityInfo) {
    return (
      <aside className="w-64 h-screen sticky top-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-r border-slate-200/60 dark:border-slate-700/60">
        <div className="space-y-4 animate-pulse">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </aside>
    );
  }

  const currentBoardId = searchParams?.get('boardId');
  const isHome = !currentBoardId;

  // Dynamic theme styles
  const sidebarBg = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-900/95 via-slate-900 to-slate-800/95 backdrop-blur-xl'
    : 'bg-gradient-to-br from-white/95 via-white to-slate-50/95 backdrop-blur-xl';
  
  const borderColor = theme === 'dark' 
    ? 'border-slate-700/40' 
    : 'border-slate-200/60';

  return (
    <aside className={cn(
      'w-64 h-screen sticky top-0 flex flex-col border-r shadow-xl shadow-slate-900/5',
      sidebarBg,
      borderColor
    )}>
      {/* Branding Section - Gorgeous header */}
      <div className="relative overflow-hidden">
        <div className={cn(
          'p-6 pb-4 border-b backdrop-blur-sm',
          theme === 'dark' 
            ? 'border-slate-700/40 bg-gradient-to-r from-slate-800/50 to-slate-700/30' 
            : 'border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/50'
        )}>
          <div className="flex items-center space-x-4 relative z-10">
            {communityInfo.smallLogoUrl && (
              <div className="relative">
                <div className={cn(
                  'w-11 h-11 rounded-xl shadow-lg ring-1 overflow-hidden',
                  theme === 'dark' 
                    ? 'ring-slate-600/30 shadow-slate-900/20' 
                    : 'ring-slate-200/40 shadow-slate-900/10'
                )}>
                  <Image
                    src={communityInfo.smallLogoUrl}
                    alt={`${communityInfo.title} logo`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className={cn(
                'text-base font-semibold truncate',
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                {communityInfo.title}
              </h1>
              <p className={cn(
                'text-xs mt-0.5',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )}>
                Community
              </p>
            </div>
          </div>
        </div>
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5 pointer-events-none" />
      </div>

      {/* Navigation Section - Beautiful menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Home Link */}
        <Link
          href={`/?communityId=${communityInfo.id}`}
          className={cn(
            'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
            isHome
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 shadow-lg shadow-blue-500/10'
                : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 shadow-lg shadow-blue-500/10'
              : theme === 'dark'
                ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          )}
        >
          <div className={cn(
            'p-1.5 rounded-lg mr-3 transition-all duration-200',
            isHome
              ? theme === 'dark'
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-blue-500/10 text-blue-600'
              : theme === 'dark'
                ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
                : 'bg-slate-200/50 text-slate-500 group-hover:bg-slate-300/50 group-hover:text-slate-700'
          )}>
            <Home size={16} />
          </div>
          <span className="flex-1">Home</span>
          {isHome && (
            <ChevronRight size={14} className="opacity-60" />
          )}
          
          {/* Active indicator */}
          {isHome && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl" />
          )}
        </Link>

        {/* Boards Section */}
        {boardsList && boardsList.length > 0 && (
          <div className="pt-6 pb-2">
            <h3 className={cn(
              'px-3 text-xs font-semibold uppercase tracking-wider mb-3',
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              Boards
            </h3>
            <div className="space-y-1">
              {boardsList.map((board) => {
                const isActive = currentBoardId === board.id.toString();
                return (
                  <Link
                    key={board.id}
                    href={`/?communityId=${communityInfo.id}&boardId=${board.id}`}
                    className={cn(
                      'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10'
                          : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 shadow-lg shadow-emerald-500/10'
                        : theme === 'dark'
                          ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    )}
                  >
                    <div className={cn(
                      'p-1.5 rounded-lg mr-3 transition-all duration-200',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-emerald-500/10 text-emerald-600'
                        : theme === 'dark'
                          ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
                          : 'bg-slate-200/50 text-slate-500 group-hover:bg-slate-300/50 group-hover:text-slate-700'
                    )}>
                      <LayoutDashboard size={16} />
                    </div>
                    <span className="flex-1 truncate">{board.name}</span>
                    {isActive && (
                      <ChevronRight size={14} className="opacity-60" />
                    )}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-xl" />
                    )}
                  </Link>
                );
              })}
              
              {/* Create Board Link - Admin Only */}
              {(user?.isAdmin || user?.userId === process.env.NEXT_PUBLIC_SUPERADMIN_ID) && (
                <Link
                  href="/create-board"
                  className={cn(
                    'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-2',
                    theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-slate-700/50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/60'
                  )}
                >
                  <div className={cn(
                    'p-1.5 rounded-lg mr-3 transition-all duration-200',
                    theme === 'dark'
                      ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
                      : 'bg-slate-200/50 text-slate-500 group-hover:bg-slate-300/50 group-hover:text-slate-700'
                  )}>
                    <Plus size={16} />
                  </div>
                  <span className="flex-1">Create Board</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {!boardsList && (
          <div className="pt-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-10 rounded-xl animate-pulse',
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-slate-800/50 to-slate-700/30' 
                    : 'bg-gradient-to-r from-slate-200/50 to-slate-100/30'
                )}
              />
            ))}
          </div>
        )}

        {boardsList?.length === 0 && (
          <div className="pt-6">
            <h3 className={cn(
              'px-3 text-xs font-semibold uppercase tracking-wider mb-3',
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            )}>
              Boards
            </h3>
            <p className={cn(
              'px-3 py-4 text-sm rounded-xl text-center mb-2',
              theme === 'dark' 
                ? 'text-slate-400 bg-slate-800/30' 
                : 'text-slate-500 bg-slate-100/50'
            )}>
              No boards available
            </p>
            
            {/* Create Board Link - Admin Only */}
            {(user?.isAdmin || user?.userId === process.env.NEXT_PUBLIC_SUPERADMIN_ID) && (
              <Link
                href="/create-board"
                className={cn(
                  'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-slate-700/50'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/60'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-lg mr-3 transition-all duration-200',
                  theme === 'dark'
                    ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
                    : 'bg-slate-200/50 text-slate-500 group-hover:bg-slate-300/50 group-hover:text-slate-700'
                )}>
                  <Plus size={16} />
                </div>
                <span className="flex-1">Create Board</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Footer Section - Community Settings */}
      <div className={cn(
        'p-3 border-t backdrop-blur-sm',
        theme === 'dark' 
          ? 'border-slate-700/40 bg-slate-900/50' 
          : 'border-slate-200/60 bg-white/50'
      )}>
        <Link
          href="/community-settings"
          className={cn(
            'group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full',
            theme === 'dark'
              ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          )}
        >
          <div className={cn(
            'p-1.5 rounded-lg mr-3 transition-all duration-200',
            theme === 'dark'
              ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300'
              : 'bg-slate-200/50 text-slate-500 group-hover:bg-slate-300/50 group-hover:text-slate-700'
          )}>
            <Settings size={16} />
          </div>
          <span className="flex-1 text-sm font-medium">Community Settings</span>
        </Link>
      </div>
    </aside>
  );
}; 