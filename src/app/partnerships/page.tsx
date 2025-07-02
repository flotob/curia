import { Metadata } from 'next';
import PartnershipManager from '@/components/partnerships/PartnershipManager';

export const metadata: Metadata = {
  title: 'Community Partnerships',
  description: 'Manage partnerships with other communities',
};

export default function PartnershipsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Community Partnerships
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Manage partnerships and collaborations with other communities
        </p>
      </div>
      
      <PartnershipManager mode="page" />
    </div>
  );
} 