'use client';

import React from 'react';
import { LockBrowser } from '@/components/locks/LockBrowser';

export default function LocksPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Access Control Locks
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Browse and manage reusable access control configurations for your community.
        </p>
      </div>
      
      <LockBrowser />
    </div>
  );
} 