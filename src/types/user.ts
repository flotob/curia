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
  
  // Background customization settings
  background?: {
    imageUrl: string;           // URL to the background image
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y' | 'space' | 'round';
    size: 'auto' | 'cover' | 'contain' | string; // CSS background-size values
    position: string;           // CSS background-position (e.g., 'center center', 'top left')
    attachment: 'scroll' | 'fixed' | 'local';
    opacity: number;            // 0-1, for overlay effect
    overlayColor?: string;      // Optional overlay color (hex)
    blendMode?: string;         // CSS mix-blend-mode
    useThemeColor?: boolean;    // Use theme background color instead of custom overlay
    disableCommunityBackground?: boolean; // Explicitly disable community background without setting custom image
  };
  
  // Future: Add other social platforms as needed
} 