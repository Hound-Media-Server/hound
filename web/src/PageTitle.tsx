import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Hound",
  "/login": "Login - Hound",
  "/logout": "Hound",
  "/admin": "Admin - Hound",
  "/settings": "Settings - Hound",
  "/library": "My Collections - Hound",
  "/live-tv": "Live TV - Hound",
  "/activity": "Activity - Hound",
};

export default function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = routeTitles[pathname] ?? "Hound";
  }, [pathname]);
  return null;
}
