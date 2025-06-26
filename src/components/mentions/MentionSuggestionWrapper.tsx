import React, { useEffect } from 'react';
import { SuggestionProps } from '@tiptap/suggestion';
import { MentionList, MentionListRef } from './MentionList';
import { useMentionSearch } from '@/hooks/useMentionSearch';

interface MentionSuggestionWrapperProps extends Omit<SuggestionProps, 'command'> {
  command: (props: { id: string; label: string }) => void;
}

export const MentionSuggestionWrapper = React.forwardRef<
  MentionListRef,
  MentionSuggestionWrapperProps
>((props, ref) => {
  const { query, command } = props;
  const { users, isLoading, error, searchUsers } = useMentionSearch();

  // Trigger search when query changes
  useEffect(() => {
    if (query.length >= 2) {
      searchUsers(query);
    }
  }, [query, searchUsers]);

  return (
    <MentionList
      ref={ref}
      users={users}
      isLoading={isLoading}
      error={error}
      command={command}
    />
  );
});

MentionSuggestionWrapper.displayName = 'MentionSuggestionWrapper'; 