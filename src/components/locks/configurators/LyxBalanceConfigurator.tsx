'use client';

import React from 'react';
import { TokenBalanceConfigurator } from './TokenBalanceConfigurator';
import { LYX_TOKEN_CONFIG } from './tokenConfigs';
import { GatingRequirement } from '@/types/locks';

interface LyxBalanceConfiguratorProps {
  editingRequirement?: GatingRequirement;
  onSave: (requirement: GatingRequirement) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const LyxBalanceConfigurator: React.FC<LyxBalanceConfiguratorProps> = (props) => {
  return (
    <TokenBalanceConfigurator
      tokenConfig={LYX_TOKEN_CONFIG}
      {...props}
    />
  );
}; 