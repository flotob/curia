'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [decodedToken, setDecodedToken] = useState<object | null>(null);

  useEffect(() => {
    if (token) {
      try {
        // Basic JWT decoding (payload only for simplicity, no verification here)
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        setDecodedToken(decodedPayload);
      } catch (error) {
        console.error("Failed to decode JWT:", error);
        setDecodedToken({ error: "Failed to decode JWT" });
      }
    }
  }, [token]);

  if (isLoading) {
    return <div className="p-4">Loading auth data...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Auth Debug Page</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <p>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">User Object (from AuthContext)</h2>
        {user ? (
          <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p>No user object available.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Raw JWT Token</h2>
        {token ? (
          <textarea 
            readOnly 
            className="w-full h-32 p-2 border rounded-md bg-slate-100 dark:bg-slate-800 text-sm"
            value={token}
          />
        ) : (
          <p>No token available.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Decoded JWT Payload</h2>
        {decodedToken ? (
          <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md overflow-x-auto">
            {JSON.stringify(decodedToken, null, 2)}
          </pre>
        ) : (
          <p>No token available or failed to decode.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Environment Variables (Server-Side Only)</h2>
        <p className="text-sm text-muted-foreground">
          Note: For security reasons, `NEXT_PUBLIC_ADMIN_ROLE_IDS` is a public env var but its value 
          is best checked and acted upon by the backend. This section is a reminder of its existence.
          You can log `process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS` in a server component or API route to verify its value on the server.
        </p>
        {/* <p>NEXT_PUBLIC_ADMIN_ROLE_IDS: {process.env.NEXT_PUBLIC_ADMIN_ROLE_IDS || "Not set or not public"}</p> */}
      </section>

    </div>
  );
} 