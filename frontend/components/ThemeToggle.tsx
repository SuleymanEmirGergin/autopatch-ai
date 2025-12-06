import { useTheme } from "../contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("system");
    } else {
      setTheme("dark");
    }
  };

  const getIcon = () => {
    if (theme === "system") {
      return "🖥️";
    }
    return resolvedTheme === "dark" ? "🌙" : "☀️";
  };

  const getLabel = () => {
    if (theme === "system") {
      return "Sistem";
    }
    return resolvedTheme === "dark" ? "Karanlık" : "Açık";
  };

  return (
    <button
      className="button button-secondary"
      onClick={toggleTheme}
      title={`Tema: ${getLabel()} (Tıklayarak değiştir)`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
      }}
    >
      <span>{getIcon()}</span>
      <span>{getLabel()}</span>
    </button>
  );
}

