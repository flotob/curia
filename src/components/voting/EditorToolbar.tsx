'use client';

import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  Heading2, // Corresponds to Heading level 2
  List, // For BulletList
  ListOrdered // For OrderedList
} from 'lucide-react';

// ShadCN components for Dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  // DialogClose, // Not explicitly used if buttons handle close
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface EditorToolbarProps { // Changed from Props to avoid conflict if Props is used elsewhere
    editor: Editor | null;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  // Hooks must be called before any early returns
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // Early return after hooks
  if (!editor) return null;

  // Helper to create toolbar buttons
  const ToolbarButton = (
    {
      onClick: action,
      isActive,
      icon: Icon,
      ariaLabel,
      title,
      disabled = false
    }: {
      onClick: () => void;
      isActive: boolean;
      icon: React.ElementType;
      ariaLabel: string;
      title?: string;
      disabled?: boolean;
    }
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      disabled={disabled || !editor.isEditable}
      className={`p-2 rounded-md hover:bg-muted/70 disabled:opacity-50 ${
        isActive ? 'bg-muted text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon size={18} />
    </button>
  );

  const handleLink = () => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    setCurrentLinkUrl(editor.getAttributes('link').href || '');
    setIsLinkDialogOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    if (currentLinkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: currentLinkUrl.trim() }).run();
    }
    setIsLinkDialogOpen(false);
    setCurrentLinkUrl('');
  };

  const handleImage = () => {
    if (!editor) return;
    // For new images, URL is empty. If editing an existing image (not typical via toolbar), prefill.
    const existingSrc = editor.getAttributes('image').src;
    setCurrentImageUrl(existingSrc || ''); 
    setIsImageDialogOpen(true);
  };

  const applyImage = () => {
    if (!editor) return;
    if (currentImageUrl.trim()) {
      editor.chain().focus().setImage({ src: currentImageUrl.trim() }).run();
    }
    setIsImageDialogOpen(false);
    setCurrentImageUrl('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border rounded-md p-1 bg-background relative">
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold} 
        ariaLabel='Toggle bold' 
        title='Bold (Ctrl+B)'
        disabled={!editor.can().chain().focus().toggleBold().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic} 
        ariaLabel='Toggle italic' 
        title='Italic (Ctrl+I)'
        disabled={!editor.can().chain().focus().toggleItalic().run()} />
      <ToolbarButton 
        onClick={handleLink} 
        isActive={editor.isActive('link')} 
        icon={LinkIcon} 
        ariaLabel='Set link' 
        title='Link (Ctrl+K)'
        disabled={!editor.can().chain().focus().toggleLink({href: ''}).run()} />
      <ToolbarButton 
        onClick={handleImage} 
        isActive={editor.isActive('image')} 
        icon={ImageIcon} 
        ariaLabel='Insert image'
        disabled={!editor.can().chain().focus().setImage({src: ''}).run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleCodeBlock({ language: 'plaintext' }).run()}
        isActive={editor.isActive('codeBlock')}
        icon={Code} 
        ariaLabel='Toggle code block' 
        title='Code Block'
        disabled={!editor.can().chain().focus().toggleCodeBlock().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote} 
        ariaLabel='Toggle blockquote' 
        title='Blockquote'
        disabled={!editor.can().chain().focus().toggleBlockquote().run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2} 
        ariaLabel='Toggle H2 heading' 
        title='Heading 2'
        disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List} 
        ariaLabel='Toggle bullet list' 
        title='Bullet List'
        disabled={!editor.can().chain().focus().toggleBulletList().run()} />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        ariaLabel='Toggle ordered list'
        title='Ordered List'
        disabled={!editor.can().chain().focus().toggleOrderedList().run()} />
      {/* Add more buttons as needed, e.g., for other heading levels, strikethrough, etc. */}

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the link. Leave blank or submit an empty URL to remove the link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link-url" className="text-right">
                URL
              </Label>
              <Input
                id="link-url"
                value={currentLinkUrl}
                onChange={(e) => setCurrentLinkUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={applyLink}>Save Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Enter the URL for the image.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-url" className="text-right">
                URL
              </Label>
              <Input
                id="image-url"
                value={currentImageUrl}
                onChange={(e) => setCurrentImageUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://example.com/image.png"
                onKeyDown={(e) => e.key === 'Enter' && applyImage()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsImageDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={applyImage}>Insert Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
