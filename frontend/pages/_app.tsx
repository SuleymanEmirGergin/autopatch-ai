import type { AppProps } from "next/app";
import { ThemeProvider } from "../contexts/ThemeContext";
import "../styles/globals.css";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AccessibilityHelper } from "../components/AccessibilityHelper";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessibilityHelper />
        <main id="main-content">
          <Component {...pageProps} />
        </main>
      </ThemeProvider>
    </ErrorBoundary>
  );
}


