// src/services/AuthService.ts

type GetTokenFn = () => string | null;
type RefreshTokenFn = () => Promise<boolean>; // Returns true on success, false on failure
type LogoutFn = () => void;

class AuthServiceSingleton {
  private getTokenFn: GetTokenFn | null = null;
  private refreshTokenFn: RefreshTokenFn | null = null;
  private logoutFn: LogoutFn | null = null;
  private isRefreshing = false;

  initialize(
    getTokenFn: GetTokenFn,
    refreshTokenFn: RefreshTokenFn,
    logoutFn: LogoutFn
  ): void {
    this.getTokenFn = getTokenFn;
    this.refreshTokenFn = refreshTokenFn;
    this.logoutFn = logoutFn;
  }

  getAuthToken(): string | null {
    if (!this.getTokenFn) {
      // console.warn('AuthService not initialized or getTokenFn not provided.');
      return null;
    }
    return this.getTokenFn();
  }

  async attemptRefreshToken(): Promise<boolean> {
    if (!this.refreshTokenFn) {
      // console.warn('AuthService not initialized or refreshTokenFn not provided.');
      return false;
    }
    if (this.isRefreshing) {
      // console.log('Token refresh already in progress.');
      // Could potentially wait for the ongoing refresh, but for now, just indicate failure to initiate a new one.
      // Or, return a promise that resolves when the current refresh is done.
      // For simplicity now, let's just prevent concurrent execution.
      return false; 
    }

    this.isRefreshing = true;
    try {
      const success = await this.refreshTokenFn();
      return success;
    } catch (error) {
      console.error('[AuthService] Error during token refresh:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  performLogout(): void {
    if (!this.logoutFn) {
      // console.warn('AuthService not initialized or logoutFn not provided.');
      return;
    }
    this.logoutFn();
  }

  getIsRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// Export a single instance (singleton)
export const AuthService = new AuthServiceSingleton(); 