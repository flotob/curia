// This file previously contained an ad-hoc shim for the Universal Profile
// provider. The custom wagmi connector now handles type-safety directly, so
// the shim is no longer needed.  We retain only a narrow helper type that may
// be imported elsewhere in the codebase.

import { EIP1193Provider } from 'viem';

export interface LuksoProvider extends EIP1193Provider {
  isUniversalProfile?: boolean;
} 