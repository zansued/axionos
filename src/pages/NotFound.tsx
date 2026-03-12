import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { RetroTvError } from "@/components/ui/retro-tv-error";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <RetroTvError errorCode="404" errorMessage="NOT FOUND" />
      <a
        href="/builder/dashboard"
        className="mt-8 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
      >
        Voltar ao Dashboard
      </a>
    </div>
  );
};

export default NotFound;
