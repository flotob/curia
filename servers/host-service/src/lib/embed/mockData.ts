/**
 * Embed Mock Data - Mock data for development and demo purposes
 */

import { ProfileData, Community } from '@/types/embed';

export const createMockProfileData = (type: 'ens' | 'universal_profile'): ProfileData => {
  if (type === 'ens') {
    return {
      type: 'ens',
      address: '0x1234567890123456789012345678901234567890',
      name: 'vitalik.eth',
      avatar: null,
      domain: 'vitalik.eth',
      balance: '3.45',
      verificationLevel: 'verified'
    };
  }

  return {
    type: 'universal_profile',
    address: '0x9876543210987654321098765432109876543210',
    name: 'Florian',
    avatar: null,
    balance: '47.2',
    followerCount: 1337,
    verificationLevel: 'verified'
  };
};

export const createAnonymousProfileData = (name: string): ProfileData => ({
  type: 'anonymous',
  name,
  verificationLevel: 'unverified'
});

export const getMockCommunities = (): Community[] => [
  {
    id: 'lukso-community',
    name: 'LUKSO Community',
    description: 'The decentralized creative economy',
    memberCount: 12847,
    isPublic: true,
    gradientClass: 'gradient-pink-purple',
    icon: '🆙'
  },
  {
    id: 'ethereum-builders',
    name: 'Ethereum Builders',
    description: 'Building the future of Web3',
    memberCount: 8293,
    isPublic: true,
    gradientClass: 'gradient-blue-cyan',
    icon: '⟠'
  },
  {
    id: 'defi-governance',
    name: 'DeFi Governance',
    description: 'Decentralized finance protocols & governance',
    memberCount: 5642,
    isPublic: true,
    gradientClass: 'gradient-emerald-teal',
    icon: '🏛️'
  },
  {
    id: 'nft-creators',
    name: 'NFT Creators',
    description: 'Digital art and creative NFT community',
    memberCount: 3821,
    isPublic: true,
    gradientClass: 'gradient-orange-pink',
    icon: '🎨'
  }
]; 