/**
 * Rich Category Headers for Gating Requirements
 * 
 * Beautiful, informative headers that show verification status and details at a glance
 * without requiring users to expand categories to understand what's happening.
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Coins,
  Users
} from 'lucide-react';
import { CategoryStatus } from '@/hooks/useGatingData';

// ===== UTILITY FUNCTIONS =====

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatETH = (weiAmount: string): string => {
  try {
    const eth = parseFloat(weiAmount) / 1e18;
    return eth < 0.001 ? '< 0.001' : eth.toFixed(3);
  } catch {
    return '0';
  }
};

const formatLYX = (weiAmount: string): string => {
  try {
    const lyx = parseFloat(weiAmount) / 1e18;
    return lyx < 0.001 ? '< 0.001' : lyx.toFixed(3);
  } catch {
    return '0';
  }
};

const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return 'unknown';
  }
};

const generateAvatarGradient = (address: string): string => {
  const colors = [
    'from-pink-400 to-purple-500',
    'from-blue-400 to-indigo-500', 
    'from-green-400 to-teal-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-pink-500',
    'from-purple-400 to-pink-500'
  ];
  const index = parseInt(address.slice(2, 4), 16) % colors.length;
  return colors[index];
};

// ===== STATUS UTILITIES =====

const getStatusIcon = (status: CategoryStatus['verificationStatus']) => {
  switch (status) {
    case 'verified':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'expired':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default:
      return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: CategoryStatus['verificationStatus']) => {
  switch (status) {
    case 'verified':
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
    case 'expired':
      return <Badge variant="destructive">Expired</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
};

const getHeaderStyling = (status: CategoryStatus['verificationStatus'], isHovered: boolean = false) => {
  const hoverIntensity = isHovered ? 'hover:shadow-md' : '';
  
  switch (status) {
    case 'verified':
      return `border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 ${hoverIntensity}`;
    case 'pending':
      return `border-l-4 border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 ${hoverIntensity}`;
    case 'expired':
      return `border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 ${hoverIntensity}`;
    default:
      return `border-l-4 border-gray-300 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 ${hoverIntensity}`;
  }
};

// ===== COMPONENT INTERFACES =====

interface RichCategoryHeaderProps {
  category: CategoryStatus;
  isExpanded: boolean;
  onToggle: () => void;
}

// ===== UNIVERSAL PROFILE RICH HEADER =====

export const UniversalProfileRichHeader: React.FC<RichCategoryHeaderProps> = ({
  category,
  isExpanded,
  onToggle
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className={`p-4 cursor-pointer transition-all duration-200 ${getHeaderStyling(category.verificationStatus, isHovered)}`}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        {/* Left: Status + Profile + Holdings */}
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          {getStatusIcon(category.verificationStatus)}
          
          {/* Profile Section */}
          {category.verificationData?.walletAddress ? (
            <div className="flex items-center space-x-3">
              {/* Profile Picture */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                {category.verificationData.verifiedProfiles?.avatar ? (
                  <img 
                    src={category.verificationData.verifiedProfiles.avatar} 
                    alt={category.verificationData.verifiedProfiles.displayName || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${generateAvatarGradient(category.verificationData.walletAddress)} flex items-center justify-center text-white text-sm font-medium`}>
                    {category.verificationData.verifiedProfiles?.displayName?.charAt(0).toUpperCase() || 
                     category.verificationData.walletAddress.charAt(2).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Name and Username */}
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {category.verificationData.verifiedProfiles?.displayName || formatAddress(category.verificationData.walletAddress)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {category.verificationData.verifiedProfiles?.username || 
                   `LUKSO • ${formatAddress(category.verificationData.walletAddress)}`}
                </div>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg">
                ⬡
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {category.metadata?.name || 'Universal Profile'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Connect your Universal Profile
                </div>
              </div>
            </div>
          )}
          
          {/* Holdings Summary */}
          {category.verificationData && (
            <div className="flex items-center space-x-2">
              {/* LYX Balance */}
              {category.verificationData.verifiedBalances?.native && (
                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700">
                  <Coins className="w-3 h-3 mr-1" />
                  {formatLYX(category.verificationData.verifiedBalances.native)} LYX
                </Badge>
              )}
              
              {/* Token Holdings */}
              {category.verificationData.verifiedBalances?.tokens?.slice(0, 2).map((token, idx) => (
                <Badge key={idx} variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                  {token.symbol}
                </Badge>
              ))}
              
              {/* Social Status */}
              {category.verificationData.verifiedSocial?.followerCount !== undefined && (
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700">
                  <Users className="w-3 h-3 mr-1" />
                  {category.verificationData.verifiedSocial.followerCount}
                </Badge>
              )}
              
              {/* More Tokens Indicator */}
              {category.verificationData.verifiedBalances?.tokens && category.verificationData.verifiedBalances.tokens.length > 2 && (
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  +{category.verificationData.verifiedBalances.tokens.length - 2} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Time Info + Status + Expand */}
        <div className="flex items-center space-x-3">
          {/* Time Information */}
          {category.verifiedAt && (
            <div className="text-xs text-muted-foreground">
              <div>Verified {formatRelativeTime(category.verifiedAt)}</div>
              {category.expiresAt && (
                <div>Expires {formatRelativeTime(category.expiresAt)}</div>
              )}
            </div>
          )}
          
          {/* Status Badge */}
          {getStatusBadge(category.verificationStatus)}
          
          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
};

// ===== ETHEREUM RICH HEADER =====

export const EthereumRichHeader: React.FC<RichCategoryHeaderProps> = ({
  category,
  isExpanded,
  onToggle
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      className={`p-4 cursor-pointer transition-all duration-200 ${getHeaderStyling(category.verificationStatus, isHovered)}`}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        {/* Left: Status + Wallet + Holdings */}
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          {getStatusIcon(category.verificationStatus)}
          
          {/* Wallet Section */}
          {category.verificationData?.walletAddress ? (
            <div className="flex items-center space-x-3">
              {/* Ethereum Icon */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                ⟠
              </div>
              
              {/* Wallet Info */}
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {category.verificationData.verifiedProfiles?.ensName || formatAddress(category.verificationData.walletAddress)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Ethereum • {formatAddress(category.verificationData.walletAddress)}
                </div>
              </div>
            </div>
          ) : (
            /* Not Connected State */
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                ⟠
              </div>
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {category.metadata?.name || 'Ethereum Profile'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Connect your Ethereum wallet
                </div>
              </div>
            </div>
          )}
          
          {/* Holdings Summary */}
          {category.verificationData && (
            <div className="flex items-center space-x-2">
              {/* ETH Balance */}
              {category.verificationData.verifiedBalances?.native && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                  <Coins className="w-3 h-3 mr-1" />
                  {formatETH(category.verificationData.verifiedBalances.native)} ETH
                </Badge>
              )}
              
              {/* ENS Badge */}
              {category.verificationData.verifiedProfiles?.ensName && (
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700">
                  <User className="w-3 h-3 mr-1" />
                  ENS
                </Badge>
              )}
              
              {/* Token Holdings */}
              {category.verificationData.verifiedBalances?.tokens?.slice(0, 2).map((token, idx) => (
                <Badge key={idx} variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
                  {token.symbol}
                </Badge>
              ))}
              
              {/* More Tokens Indicator */}
              {category.verificationData.verifiedBalances?.tokens && category.verificationData.verifiedBalances.tokens.length > 2 && (
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  +{category.verificationData.verifiedBalances.tokens.length - 2} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Time Info + Status + Expand */}
        <div className="flex items-center space-x-3">
          {/* Time Information */}
          {category.verifiedAt && (
            <div className="text-xs text-muted-foreground">
              <div>Verified {formatRelativeTime(category.verifiedAt)}</div>
              {category.expiresAt && (
                <div>Expires {formatRelativeTime(category.expiresAt)}</div>
              )}
            </div>
          )}
          
          {/* Status Badge */}
          {getStatusBadge(category.verificationStatus)}
          
          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN RICH HEADER COMPONENT =====

interface RichCategoryHeaderMainProps {
  category: CategoryStatus;
  isExpanded: boolean;
  onToggle: () => void;
}

export const RichCategoryHeader: React.FC<RichCategoryHeaderMainProps> = ({
  category,
  isExpanded,
  onToggle
}) => {
  switch (category.type) {
    case 'universal_profile':
      return (
        <UniversalProfileRichHeader
          category={category}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      );
    case 'ethereum_profile':
      return (
        <EthereumRichHeader
          category={category}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      );
    default:
      // Fallback for unknown category types
      return (
        <div 
          className={`p-4 cursor-pointer transition-all duration-200 ${getHeaderStyling(category.verificationStatus)}`}
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(category.verificationStatus)}
              <div>
                <div className="font-medium text-sm">
                  {category.metadata?.name || category.type}
                </div>
                <div className="text-xs text-muted-foreground">
                  {category.metadata?.description || `Verify your ${category.type}`}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusBadge(category.verificationStatus)}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      );
  }
}; 