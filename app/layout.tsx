import { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

// Define comprehensive metadata for SEO
export const metadata: Metadata = {
  title: 'VLSIGPT Code Studio - AI-Powered VLSI Design & Coding Platform',
  description:
    'VLSIGPT Code Studio is an AI-powered platform for VLSI design, coding, and simulation. Create, test, and optimize your VLSI projects with cutting-edge tools and AI assistance.',
  authors: [{ name: 'VLSIGPT Team', url: 'https://vlsigpt.com' }],
  robots: 'index, follow',
  openGraph: {
    title: 'VLSIGPT Code Studio - AI-Powered VLSI Design & Coding',
    description:
      'Build and simulate VLSI projects with VLSIGPT Code Studio, the ultimate AI-driven coding and design platform.',
    url: 'https://app.vlsigpt.com',
    siteName: 'VLSIGPT Code Studio',
    images: [
      {
        url: 'https://vlsigpt.com/favicon.ico', // Replace with actual image URL
        width: 1200,
        height: 630,
        alt: 'VLSIGPT Code Studio Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VLSIGPT Code Studio - AI-Powered VLSI Design',
    description:
      'Create and optimize VLSI designs with VLSIGPT Code Studio, an AI-powered coding platform.',
    images: ['https://vlsigpt.com/twitter-image.jpg'], // Replace with actual image URL
    creator: '@VLSIGPT', // Replace with your Twitter handle
  },
  alternates: {
    canonical: 'https://vlsigpt.com', // Replace with your canonical URL
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon and other icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-60MKNV5SJF"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-60MKNV5SJF');
          `}
        </Script>
        {/* Structured Data (JSON-LD) for Software Application */}
        <Script
          type="application/ld+json"
          id="structured-data"
        >
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'VLSIGPT Code Studio',
            operatingSystem: 'Web',
            applicationCategory: 'DeveloperApplication',
            description:
              'VLSIGPT Code Studio is an AI-powered platform for VLSI design, coding, and simulation.',
            url: 'https://vlsigpt.com',
            publisher: {
              '@type': 'Organization',
              name: 'VLSIGPT',
              url: 'https://vlsigpt.com',
            },
            image: 'https://vlsigpt.com/og-image.jpg',
          })}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
