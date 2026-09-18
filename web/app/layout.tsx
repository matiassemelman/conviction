import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Conviction — Evidence workspace',
  description:
    'A fictional venture diligence case. Inspect assumptions, conflicting sources and the next useful question.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
