import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cinebox / Jelajahi Film, Serial TV, Anime, dan Drama Korea',
  description: 'Jelajahi pilihan film dan serial di Cinebox. Sumber video dan pilihan subtitle tersedia melalui pemutar pihak ketiga.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
