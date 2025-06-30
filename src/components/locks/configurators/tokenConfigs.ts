import { Coins, Zap } from 'lucide-react';
import { 
  parseLyxToWei,
  formatWeiToLyx,
  isValidLyxAmount,
  parseEthToWei,
  formatWeiToEth,
  isValidEthAmount
} from '@/lib/requirements/conversions';
import { TokenConfig } from './TokenBalanceConfigurator';

export const LYX_TOKEN_CONFIG: TokenConfig = {
  symbol: 'LYX',
  name: 'LUKSO',
  icon: Coins,
  brandColor: '#ff006b',
  gradientFrom: 'pink-50',
  gradientTo: 'purple-50',
  placeholder: 'e.g., 50',
  helpText: 'LYX is the native currency of LUKSO. Users must have this amount in their Universal Profile to access gated content.',
  parseAmount: parseLyxToWei,
  formatAmount: formatWeiToLyx,
  isValidAmount: isValidLyxAmount,
  requirementType: 'lyx_balance'
};

export const ETH_TOKEN_CONFIG: TokenConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  icon: Zap,
  brandColor: '#627EEA',
  gradientFrom: 'blue-50',
  gradientTo: 'indigo-50',
  placeholder: 'e.g., 0.1',
  helpText: 'ETH is the native currency of Ethereum. Users must have this amount in their connected wallet to access gated content.',
  parseAmount: parseEthToWei,
  formatAmount: formatWeiToEth,
  isValidAmount: isValidEthAmount,
  requirementType: 'eth_balance'
};