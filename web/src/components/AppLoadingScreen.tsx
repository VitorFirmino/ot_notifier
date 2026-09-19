import React from "react";
import logo from "@assets/logo.png";

export const AppLoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-breathe">
      <img
        src={logo}
        alt="OT Notifier"
        className="h-16 w-16 rounded-2xl object-cover shadow-[0_0_44px_-6px_var(--primary)]"
      />
    </div>
  </div>
);
