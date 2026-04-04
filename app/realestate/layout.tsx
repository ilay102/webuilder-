import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meridian Estates | Where Architecture Meets Legacy',
  description: 'Premium real estate in Tel Aviv\'s most coveted addresses. Residential, commercial and investment properties.',
};

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=DM+Sans:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div style={{ height: 'auto', overflow: 'visible', background: '#0c0d0f' }}>
        {children}
      </div>
    </>
  );
}
