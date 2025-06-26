// LSP7 and LSP8 Contract ABIs for token verification
// These are minimal ABIs containing only the functions we need

/**
 * LSP7 Digital Asset ABI (Fungible Tokens)
 * Similar to ERC20 but with additional LUKSO-specific features
 */
export const LSP7_ABI = [
  // balanceOf - Get token balance for an address
  {
    "inputs": [{"internalType": "address", "name": "tokenOwner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // name - Get token name
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view", 
    "type": "function"
  },
  // symbol - Get token symbol
  {
    "inputs": [],
    "name": "symbol", 
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  // decimals - Get token decimals (LSP7 specific)
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  // supportsInterface - ERC165 interface detection
  {
    "inputs": [{"internalType": "bytes4", "name": "interfaceId", "type": "bytes4"}],
    "name": "supportsInterface",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * LSP8 Identifiable Digital Asset ABI (NFTs)
 * Similar to ERC721 but uses bytes32 token IDs instead of uint256
 */
export const LSP8_ABI = [
  // balanceOf - Get number of NFTs owned by address
  {
    "inputs": [{"internalType": "address", "name": "tokenOwner", "type": "address"}],
    "name": "balanceOf", 
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // tokenOwnerOf - Get owner of specific token ID (LSP8 uses bytes32 IDs)
  {
    "inputs": [{"internalType": "bytes32", "name": "tokenId", "type": "bytes32"}],
    "name": "tokenOwnerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  // name - Get collection name
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  // symbol - Get collection symbol
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  // totalSupply - Get total number of tokens minted
  {
    "inputs": [],
    "name": "totalSupply", 
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // supportsInterface - ERC165 interface detection
  {
    "inputs": [{"internalType": "bytes4", "name": "interfaceId", "type": "bytes4"}],
    "name": "supportsInterface",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view", 
    "type": "function"
  }
] as const;

/**
 * LUKSO Standard Interface IDs
 * Used with supportsInterface() to detect contract types
 */
export const LUKSO_INTERFACE_IDS = {
  // LSP7 Digital Asset interface ID
  LSP7: '0xb3c4928f',
  // LSP8 Identifiable Digital Asset interface ID  
  LSP8: '0x1ae9ba1f',
  // ERC165 interface detection standard
  ERC165: '0x01ffc9a7'
} as const;

/**
 * Function selectors for manual ABI encoding (like we do for ERC-1271)
 * These are the first 4 bytes of keccak256(functionSignature)
 */
export const TOKEN_FUNCTION_SELECTORS = {
  // LSP7 functions
  LSP7_BALANCE_OF: '0x70a08231', // balanceOf(address)
  LSP7_NAME: '0x06fdde03',       // name()
  LSP7_SYMBOL: '0x95d89b41',     // symbol()
  LSP7_DECIMALS: '0x313ce567',   // decimals()
  
  // LSP8 functions  
  LSP8_BALANCE_OF: '0x70a08231',     // balanceOf(address) - same as LSP7
  LSP8_TOKEN_OWNER_OF: '0x217b2270', // tokenOwnerOf(bytes32) - 🎯 FIXED: was using ERC721 ownerOf selector
  LSP8_NAME: '0x06fdde03',           // name() - same as LSP7
  LSP8_SYMBOL: '0x95d89b41',         // symbol() - same as LSP7
  LSP8_TOTAL_SUPPLY: '0x18160ddd',   // totalSupply()
  
  // Interface detection
  SUPPORTS_INTERFACE: '0x01ffc9a7'   // supportsInterface(bytes4)
} as const;

/**
 * Utility type for token verification results
 */
export interface TokenVerificationResult {
  valid: boolean;
  error?: string;
  balance?: string;
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupply?: string;
  };
}

/**
 * Utility type for token metadata
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals?: number; // Only for LSP7
  totalSupply?: string; // Mainly for LSP8
  isLSP7: boolean;
  isLSP8: boolean;
  contractAddress: string;
} 