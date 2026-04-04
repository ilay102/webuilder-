import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ilay Automation — Your Automation Starts Here',
  description: 'Architecting the Intelligent Web. AI automation, web development, and chatbots for the modern business.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 'auto', overflow: 'visible' }}>
      {children}
    </div>
  );
}
