// User settings interface for Common Ground profile data
export interface UserSettings {
  lukso?: {
    username: string;  // "florian#0a60"
    address: string;   // "0x0a607f902CAa16a27AA3Aabd968892aa89ABDa92"
  };
  ethereum?: {
    address: string;
  };
  twitter?: {
    username: string; // "heckerhut"
  };
  farcaster?: {
    displayName: string; // "Florian"
    username: string;    // "flx"
    fid: number;         // 13216
  };
  premium?: string;      // "GOLD"
  email?: string;        // "fg@blockchain.lawyer"
  // Future: Add other social platforms as needed
} 