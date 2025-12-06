import React, { useEffect } from "react";

/**
 * Accessibility Helper Component
 * 
 * Adds keyboard navigation, focus management, and ARIA labels
 */
export const AccessibilityHelper: React.FC = () => {
  useEffect(() => {
    // Skip to main content link
    const skipLink = document.createElement("a");
    skipLink.href = "#main-content";
    skipLink.textContent = "Ana içeriğe geç";
    skipLink.className = "skip-to-main";
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--accent);
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      z-index: 10000;
      border-radius: 4px;
    `;
    skipLink.addEventListener("focus", () => {
      skipLink.style.top = "0";
    });
    skipLink.addEventListener("blur", () => {
      skipLink.style.top = "-40px";
    });
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Keyboard navigation improvements
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close modals/dropdowns
      if (e.key === "Escape") {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.getAttribute("role") === "dialog") {
          activeElement.click();
        }
      }

      // Enter key on buttons
      if (e.key === "Enter" && (e.target as HTMLElement).tagName === "BUTTON") {
        (e.target as HTMLButtonElement).click();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      skipLink.remove();
    };
  }, []);

  return null;
};

/**
 * Accessible Button Component
 */
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label"?: string;
  loading?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  "aria-label": ariaLabel,
  loading,
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      aria-busy={loading}
      style={{
        ...props.style,
        position: "relative",
      }}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 16,
            height: 16,
            border: "2px solid transparent",
            borderTop: "2px solid currentColor",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      )}
      <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
    </button>
  );
};

