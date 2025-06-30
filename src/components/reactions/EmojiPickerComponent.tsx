'use client';

import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: { native: string } | string) => void;
  theme?: string;
}

const EmojiPickerComponent: React.FC<EmojiPickerComponentProps> = ({
  onEmojiSelect,
  theme = 'light'
}) => {
  return (
    <Picker
      data={data}
      onEmojiSelect={onEmojiSelect}
      theme={theme === 'dark' ? 'dark' : 'light'}
      previewPosition="none"
      skinTonePosition="none"
      maxFrequentRows={2}
      perLine={8}
      set="native"
      emojiSize={20}
      style={{ height: '400px' }}
    />
  );
};

export default EmojiPickerComponent;