import { useEffect } from "react";
import { useRouter } from "next/router";

// Redirect to overview page
export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/overview");
  }, [router]);

  return null;
}
