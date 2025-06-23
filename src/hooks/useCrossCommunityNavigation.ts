import { useCgLib } from '@/contexts/CgLibContext';
import { useToast } from '@/hooks/use-toast';

export const useCrossCommunityNavigation = () => {
  const { cgInstance } = useCgLib();
  const { toast } = useToast();

  const navigateToPost = async (
    communityShortId: string,
    pluginId: string, 
    postId: number,
    boardId: number
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
        const postData = {
          postId: postId.toString(),
          boardId: boardId.toString(), 
          token: `whats-new-${Date.now()}`,
          timestamp: Date.now()
        };
        
        const sharedContentToken = `${postId}-${boardId}-${Date.now()}`;
        const postDataJson = JSON.stringify(postData);
        
        // Use same cookie settings as existing system
        document.cookie = `shared_content_token=${sharedContentToken}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `shared_post_data=${encodeURIComponent(postDataJson)}; path=/; SameSite=None; Secure; max-age=${60 * 60 * 24 * 7}`;
        
        console.log(`[CrossCommunity] Set cookies for post ${postId} in ${communityShortId}`);
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

  return { navigateToPost };
}; 