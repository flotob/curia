/**
 * SignatureVerificationStep - Wallet signature verification
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, CheckCircle2, Edit3, ArrowRight, AlertCircle } from 'lucide-react';
import { SignatureVerificationStepProps } from '@/types/embed';

export const SignatureVerificationStep: React.FC<SignatureVerificationStepProps> = ({ 
  profileData, 
  onSignatureComplete 
}) => {
  const [verificationStatus, setVerificationStatus] = useState<'ready' | 'signing' | 'verifying' | 'complete' | 'error'>('ready');
  const [progress, setProgress] = useState(0);
  const [signature, setSignature] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Generate challenge message
  useEffect(() => {
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const challengeMessage = `Welcome to Curia!\n\nSign this message to prove you own this wallet.\n\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
    setMessage(challengeMessage);
  }, []);

  const handleSignMessage = async () => {
    if (profileData.type === 'anonymous') {
      // Skip signature for anonymous users
      onSignatureComplete();
      return;
    }

    setVerificationStatus('signing');
    setProgress(25);

    try {
      // TODO: Real wallet signing
      console.log('[Signature] Requesting signature for message:', message);
      
      // Simulate signing process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgress(50);
      
      // Mock signature response
      const mockSignature = '0x' + Array(128).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      setSignature(mockSignature);
      setVerificationStatus('verifying');
      setProgress(75);
      
      // Simulate backend verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProgress(100);
      setVerificationStatus('complete');
      
      // Wait a moment to show success, then continue
      setTimeout(() => {
        onSignatureComplete();
      }, 1000);
      
    } catch (error) {
      console.error('[Signature] Error:', error);
      setVerificationStatus('error');
      setProgress(0);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case 'ready':
        return <Badge variant="secondary">Ready to Sign</Badge>;
      case 'signing':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
            <Edit3 className="w-3 h-3 mr-1 animate-pulse" />
            Signing...
          </Badge>
        );
      case 'verifying':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
            <Shield className="w-3 h-3 mr-1 animate-pulse" />
            Verifying...
          </Badge>
        );
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified!
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="embed-step">
      <Card className="embed-card embed-card--md">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="embed-header-icon gradient-orange-red">
              <Shield className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl embed-gradient-text">
            Verify Wallet Ownership
          </CardTitle>
          <CardDescription className="text-base">
            Sign a message to prove you control this wallet
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {/* Status Display */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 border border-orange-200 dark:border-orange-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-lg font-bold">
                  🔐
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {profileData.name || 'Wallet User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profileData.address ? `${profileData.address.slice(0, 6)}...${profileData.address.slice(-4)}` : 'Anonymous User'}
                  </p>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {/* Progress Bar */}
            {verificationStatus !== 'ready' && verificationStatus !== 'error' && (
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Message Preview */}
            {message && verificationStatus !== 'complete' && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-foreground mb-2">Message to Sign:</h4>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {message}
                </pre>
              </div>
            )}

            {/* Signature Display */}
            {signature && verificationStatus === 'complete' && (
              <div className="bg-green-50 dark:bg-green-950/50 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Signature Verified
                </h4>
                <p className="text-xs text-green-600 dark:text-green-300 font-mono break-all">
                  {signature}
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {verificationStatus === 'ready' && (
              <Button
                onClick={handleSignMessage}
                className="btn-gradient-orange-red min-w-[200px]"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Sign Message
              </Button>
            )}

            {verificationStatus === 'complete' && (
              <Button
                onClick={onSignatureComplete}
                className="btn-gradient-green-blue min-w-[200px]"
              >
                Continue to Communities
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {verificationStatus === 'error' && (
              <Button
                onClick={handleSignMessage}
                variant="outline"
                className="min-w-[200px]"
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              {verificationStatus === 'ready' && 'This signature doesn\'t cost any gas and proves wallet ownership'}
              {verificationStatus === 'signing' && 'Check your wallet for the signature request'}
              {verificationStatus === 'verifying' && 'Validating your signature...'}
              {verificationStatus === 'complete' && 'Wallet ownership successfully verified!'}
              {verificationStatus === 'error' && 'Signature verification failed. Please try again.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 