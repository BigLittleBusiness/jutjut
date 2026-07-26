import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error in the browser console and server logs
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f6f0",
          fontFamily: "'Inter', sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "2.5rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4ade80",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "-0.5px",
            }}
          >
            JJ
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "#1a1a2e",
              letterSpacing: "-0.3px",
            }}
          >
            jutjut
          </span>
        </div>

        {/* Warning icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            fontSize: "2rem",
          }}
        >
          ⚠️
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#1a1a2e",
            marginBottom: "0.75rem",
            letterSpacing: "-0.5px",
          }}
        >
          Something went wrong
        </h1>

        {/* User-friendly message */}
        <p
          style={{
            fontSize: "1rem",
            color: "#6b7280",
            maxWidth: "420px",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          We hit an unexpected error. Our team has been notified. Try refreshing
          the page — it usually fixes things straight away.
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#1a1a2e",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "opacity 150ms ease",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
            }
          >
            Refresh page
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "8px",
              border: "1.5px solid #d1d5db",
              backgroundColor: "transparent",
              color: "#374151",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "border-color 150ms ease",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.borderColor =
                "#9ca3af")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.borderColor =
                "#d1d5db")
            }
          >
            Go to homepage
          </button>
        </div>

        {/* Stack trace — development only */}
        {isDev && this.state.error && (
          <details
            style={{
              marginTop: "2.5rem",
              maxWidth: "640px",
              width: "100%",
              textAlign: "left",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginBottom: "0.5rem",
                userSelect: "none",
              }}
            >
              Error details (development only)
            </summary>
            <pre
              style={{
                backgroundColor: "#1a1a2e",
                color: "#f87171",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.75rem",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
