'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, MessageSquare, Settings, Plus, HelpCircle, BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';

interface ActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  message: string; // The message to send to chat when clicked
  adminOnly?: boolean;
}

interface ClippySpeechBubbleProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  onActionClick: (message: string) => void; // Callback to send message to chat and open modal
  tone?: 'welcoming' | 'helpful' | 'encouraging' | 'admin-focused';
  duration?: number; // Auto-hide duration in ms
}

// Static action buttons for testing - will be dynamic later
const getActionButtons = (isAdmin: boolean): ActionButton[] => {
  const commonButtons: ActionButton[] = [
    {
      id: 'help',
      label: 'Get Help',
      icon: <HelpCircle className="w-4 h-4" />,
      message: 'I need help navigating the platform. Can you guide me?'
    },
    {
      id: 'create-post',
      label: 'Create Post',
      icon: <Plus className="w-4 h-4" />,
      message: 'I want to create a new post. Can you help me get started?'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      message: 'Hi! I\'d like to chat and learn more about what you can help me with.'
    }
  ];

  const adminButtons: ActionButton[] = [
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      message: 'Show me community analytics and engagement metrics.',
      adminOnly: true
    },
    {
      id: 'manage-users',
      label: 'Manage Users',
      icon: <Users className="w-4 h-4" />,
      message: 'I need help managing community members and permissions.',
      adminOnly: true
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      message: 'Help me configure community settings and preferences.',
      adminOnly: true
    }
  ];

  return isAdmin ? [...commonButtons, ...adminButtons] : commonButtons;
};

export default function ClippySpeechBubble({
  message,
  isVisible,
  onClose,
  onActionClick,
  tone = 'welcoming',
  duration = 0 // Disabled by default - no auto-hide
}: ClippySpeechBubbleProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const isAdmin = user?.isAdmin || false;
  const isDark = theme === 'dark';

  // Auto-hide timer (only if duration > 0)
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  // Show actions after a brief delay
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShowActions(true);
      }, 1000); // Show actions 1 second after bubble appears

      return () => clearTimeout(timer);
    } else {
      setShowActions(false);
    }
  }, [isVisible]);

  const actionButtons = getActionButtons(isAdmin);

  const getToneStyles = (tone: string) => {
    const baseStyles = {
      light: {
        bg: 'bg-white/95 backdrop-blur-sm',
        border: 'border-gray-200/50',
        text: 'text-gray-900',
        shadow: 'shadow-lg shadow-black/5'
      },
      dark: {
        bg: 'bg-gray-900/95 backdrop-blur-sm',
        border: 'border-gray-700/50',
        text: 'text-gray-100',
        shadow: 'shadow-lg shadow-black/20'
      }
    };

    const toneGradients = {
      'admin-focused': {
        light: 'from-red-500/20 via-orange-500/20 to-red-500/20',
        dark: 'from-red-500/30 via-orange-500/30 to-red-500/30',
        accent: 'text-red-600 dark:text-red-400'
      },
      'helpful': {
        light: 'from-blue-500/20 via-cyan-500/20 to-blue-500/20',
        dark: 'from-blue-500/30 via-cyan-500/30 to-blue-500/30',
        accent: 'text-blue-600 dark:text-blue-400'
      },
      'encouraging': {
        light: 'from-green-500/20 via-emerald-500/20 to-green-500/20',
        dark: 'from-green-500/30 via-emerald-500/30 to-green-500/30',
        accent: 'text-green-600 dark:text-green-400'
      },
      'welcoming': {
        light: 'from-purple-500/20 via-pink-500/20 to-purple-500/20',
        dark: 'from-purple-500/30 via-pink-500/30 to-purple-500/30',
        accent: 'text-purple-600 dark:text-purple-400'
      }
    };

    const currentTheme = isDark ? 'dark' : 'light';
    const base = baseStyles[currentTheme];
    const gradient = toneGradients[tone as keyof typeof toneGradients];

    return {
      ...base,
      gradient: gradient[currentTheme],
      accent: gradient.accent
    };
  };

  const styles = getToneStyles(tone);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-[200px] right-[180px] md:bottom-[220px] md:right-[200px] z-30 max-w-[300px] md:max-w-[350px]"
        >
          <Card className={`${styles.bg} ${styles.border} border ${styles.shadow} overflow-hidden`}>
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} pointer-events-none`} />
            
            <CardContent className="p-4 relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10 z-10"
              >
                <X className="w-3 h-3" />
              </Button>

              {/* Clippy avatar and message */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full ${styles.accent} flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-current/20 to-current/30`}>
                  <span className="text-lg">📎</span>
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-sm ${styles.text} leading-relaxed font-medium`}>
                    {message}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="flex flex-wrap gap-2 pt-3 border-t border-current/10"
                  >
                    {actionButtons.map((button) => (
                      <Button
                        key={button.id}
                        variant="outline"
                        size="sm"
                        onClick={() => onActionClick(button.message)}
                        className="h-8 px-3 text-xs bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border-current/20 hover:border-current/40 transition-all duration-200"
                      >
                        {button.icon}
                        <span className="ml-1.5">{button.label}</span>
                      </Button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Speech bubble tail pointing to Clippy */}
              <div 
                className={`absolute bottom-[-8px] right-[40px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700`}
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 