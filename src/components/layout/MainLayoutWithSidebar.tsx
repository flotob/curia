'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import React from 'react';

interface MainLayoutWithSidebarProps {
  children: React.ReactNode;
}

export const MainLayoutWithSidebar: React.FC<MainLayoutWithSidebarProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  React.useEffect(() => {
    // Environment variables starting with NEXT_PUBLIC_ are available on the client.
    const superAdminId = process.env.NEXT_PUBLIC_SUPERADMIN_ID;
    if (isAuthenticated && user?.userId && superAdminId) {
      setIsSuperAdmin(user.userId === superAdminId);
    } else {
      setIsSuperAdmin(false);
    }
  }, [user, isAuthenticated]);

  return (
    <div className="flex min-h-screen">
      {isSuperAdmin && <Sidebar />}
      <main className={`flex-grow p-4 md:p-6 ${!isSuperAdmin ? 'w-full' : ''}`}>
        {/* If sidebar is not shown, main can take full width if needed, 
            or rely on flex-grow. Explicit w-full if sidebar is hidden can be useful. */}
        {children}
      </main>
    </div>
  );
}; 