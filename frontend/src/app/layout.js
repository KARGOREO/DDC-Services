import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import ClientThemeProvider from '@/components/ClientThemeProvider';
import "./globals.css";

export const metadata = {
  title: "DDC Management Platform",
  description: "Modern Web Application for DDC Data Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <AppRouterCacheProvider>
          <ClientThemeProvider>
            {children}
          </ClientThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}


