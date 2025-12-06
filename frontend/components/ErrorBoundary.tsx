import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <h2 style={{ color: "#ef4444", marginBottom: 16 }}>
            ⚠️ Bir Hata Oluştu
          </h2>
          <p style={{ color: "#6b7280", marginBottom: 16 }}>
            Üzgünüz, beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details
              style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: "#fee2e2",
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Hata Detayları (Development)
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  overflow: "auto",
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            className="button"
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{ marginTop: 16 }}
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

