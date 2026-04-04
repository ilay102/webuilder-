import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avi Mizrahi Law | Redefining Justice',
  description: 'High-end criminal defense and civil litigation for those who value excellence.',
};

export default function LawyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0,0&display=swap"
        rel="stylesheet"
      />
      <div style={{ height: 'auto', overflow: 'visible', background: '#131313' }}>
        {children}
      </div>
    </>
  );
}
