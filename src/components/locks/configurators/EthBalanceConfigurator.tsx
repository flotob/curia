'use client';

import React from 'react';
import { TokenBalanceConfigurator } from './TokenBalanceConfigurator';
import { ETH_TOKEN_CONFIG } from './tokenConfigs';
import { GatingRequirement } from '@/types/locks';

interface EthBalanceConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const EthBalanceConfigurator: React.FC<EthBalanceConfiguratorProps> = (props) => {
  return (
    <TokenBalanceConfigurator
      tokenConfig={ETH_TOKEN_CONFIG}
      {...props}
    />
  );
}; 