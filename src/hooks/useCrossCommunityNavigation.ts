import { useCgLib } from '@/contexts/CgLibContext';
import { useToast } from '@/hooks/use-toast';
import { setSharedPostCookies, setSharedBoardCookies } from '@/utils/cookieUtils';

export const useCrossCommunityNavigation = () => {
  const { cgInstance } = useCgLib();
  const { toast } = useToast();

  const navigateToPost = async (
    communityShortId: string,
    pluginId: string, 
    postId: number,
    boardId: number,
    commentId?: number
  ) => {
    // 🆕 This function now handles both:
    // - Post navigation (postId/boardId > 0): Sets cookies + navigates to specific post
    // - Community root navigation (postId/boardId = -1): Just navigates to community home
    // Basic validation
    if (!communityShortId || !pluginId) {
      toast({
        title: "Navigation Error",
        description: "Missing community information",
        variant: "destructive"
      });
      return false;
    }

    if (!cgInstance) {
      toast({  
        title: "Navigation Error",
        description: "Plugin not ready",
        variant: "destructive"
      });
      return false;
    }

    try {
      // 🆕 Only set cookies for specific post navigation (not community root)
      if (postId !== -1 && boardId !== -1) {
        // 1) Set cookies for post navigation (using existing format)
        const token = `cross-community-${Date.now()}`;
        setSharedPostCookies(postId.toString(), boardId.toString(), token, commentId?.toString());
        
        console.log(`[CrossCommunity] Set cookies for post ${postId}${commentId ? ` comment ${commentId}` : ''} in ${communityShortId}`);
      } else {
        console.log(`[CrossCommunity] Community root navigation - no cookies needed for ${communityShortId}`);
      }
      
      // 2) Build CG URL and navigate
      const baseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.cg';
      const navigationUrl = `${baseUrl}/c/${communityShortId}/plugin/${pluginId}`;
      
      console.log(`[CrossCommunity] Final URL being sent to cgInstance.navigate():`, navigationUrl);
      console.log(`[CrossCommunity] URL breakdown:`, {
        baseUrl,
        communityShortId,
        pluginId,
        fullUrl: navigationUrl
      });
      
      await cgInstance.navigate(navigationUrl);
      
      return true;
    } catch (error) {
      console.error('Cross-community navigation failed:', error);
      toast({
        title: "Navigation Failed", 
        description: "Could not navigate to other community",
        variant: "destructive"
      });
      return false;
    }
  };

  const navigateToBoard = async (
    communityShortId: string,
    pluginId: string, 
    boardId: number
  ) => {
    // Basic validation
    if (!communityShortId || !pluginId || !boardId) {
      toast({
        title: "Navigation Error",
        description: "Missing community or board information",
        variant: "destructive"
      });
      return false;
    }

    if (!cgInstance) {
      toast({  
        title: "Navigation Error",
        description: "Plugin not ready",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Set cookies for board navigation
      const token = `cross-community-board-${Date.now()}`;
      setSharedBoardCookies(boardId.toString(), token);
      
      console.log(`[CrossCommunity] Set cookies for board ${boardId} in ${communityShortId}`);
      
      // Build CG URL and navigate
      const baseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.cg';
      const navigationUrl = `${baseUrl}/c/${communityShortId}/plugin/${pluginId}`;
      
      console.log(`[CrossCommunity] Board navigation URL:`, navigationUrl);
      console.log(`[CrossCommunity] Board URL breakdown:`, {
        baseUrl,
        communityShortId,
        pluginId,
        boardId,
        fullUrl: navigationUrl
      });
      
      await cgInstance.navigate(navigationUrl);
      
      return true;
    } catch (error) {
      console.error('Cross-community board navigation failed:', error);
      toast({
        title: "Navigation Failed", 
        description: "Could not navigate to board",
        variant: "destructive"
      });
      return false;
    }
  };

  // Legacy function - maintained for backward compatibility
  const navigateToCommunity = async (
    communityShortId: string,
    pluginId: string
  ) => {
    // Basic validation
    if (!communityShortId || !pluginId) {
      toast({
        title: "Navigation Error",
        description: "Missing community information",
        variant: "destructive"
      });
      return false;
    }

    if (!cgInstance) {
      toast({  
        title: "Navigation Error",
        description: "Plugin not ready",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Build CG URL and navigate (no cookies needed for general community navigation)
      const baseUrl = process.env.NEXT_PUBLIC_COMMON_GROUND_BASE_URL || 'https://app.cg';
      const navigationUrl = `${baseUrl}/c/${communityShortId}/plugin/${pluginId}`;
      
      console.log(`[CrossCommunity] Community navigation URL:`, navigationUrl);
      
      await cgInstance.navigate(navigationUrl);
      
      return true;
    } catch (error) {
      console.error('Cross-community general navigation failed:', error);
      toast({
        title: "Navigation Failed", 
        description: "Could not navigate to community",
        variant: "destructive"
      });
      return false;
    }
  };

  return { 
    navigateToPost, 
    navigateToBoard, 
    navigateToCommunity 
  };
}; 