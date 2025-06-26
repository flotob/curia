import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users } from 'lucide-react';
import { MentionUser } from '@/hooks/useMentionSearch';

interface MentionListProps {
  users: MentionUser[];
  isLoading: boolean;
  error: string | null;
  command: (props: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ users, isLoading, error, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selection when users change
    useEffect(() => {
      setSelectedIndex(0);
    }, [users]);

    const handleSelect = (user: MentionUser) => {
      command({
        id: user.id,
        label: user.name,
      });
    };

    const handleKeyDown = ({ event }: { event: KeyboardEvent }): boolean => {
      if (users.length === 0) return false;

      switch (event.key) {
        case 'ArrowUp':
          setSelectedIndex((prev) => (prev <= 0 ? users.length - 1 : prev - 1));
          return true;
        case 'ArrowDown':
          setSelectedIndex((prev) => (prev >= users.length - 1 ? 0 : prev + 1));
          return true;
        case 'Enter':
          if (users[selectedIndex]) {
            handleSelect(users[selectedIndex]);
          }
          return true;
        case 'Escape':
          return false; // Let Tiptap handle escape
        default:
          return false;
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: handleKeyDown,
    }));

    if (error) {
      return (
        <Card className="w-72 shadow-lg border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center text-destructive">
              <span className="text-sm">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card className="w-72 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm">Searching users...</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (users.length === 0) {
      return (
        <Card className="w-72 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center text-muted-foreground">
              <Users className="h-4 w-4 mr-2" />
              <span className="text-sm">No users found</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-72 shadow-lg max-h-64 overflow-y-auto">
        <CardContent className="p-1">
          {users.map((user, index) => {
            const isSelected = index === selectedIndex;
            const isFriend = user.source === 'friend';
            
            return (
              <Button
                key={user.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className={`w-full justify-start p-3 h-auto ${
                  isSelected ? 'bg-accent text-accent-foreground' : ''
                }`}
                onClick={() => handleSelect(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user.profile_picture_url || undefined} 
                      alt={user.name}
                    />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{user.name}</div>
                    {isFriend && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        Friend
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    );
  }
);

MentionList.displayName = 'MentionList'; 