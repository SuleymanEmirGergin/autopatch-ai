import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0F172A",
      }}
    >
      <Sidebar />
      <div
        style={{
          marginLeft: "240px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header />
        <main
          style={{
            marginTop: "64px",
            padding: "24px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
