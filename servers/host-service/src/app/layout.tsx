import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curia Host Service',
  description: 'Standalone forum hosting infrastructure for Curia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
} 