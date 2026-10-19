import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'Lernraum — немецкий с пониманием', description: 'Ваше пространство немецкого: занятия с преподавателем, словарь и честный прогресс.', icons: {icon: '/favicon.svg'}};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="ru"><body>{children}</body></html>; }
