"use client";

import * as React from "react";
import {MoonIcon, SunIcon} from "lucide-react";
import {useTheme} from "next-themes";

import {Button} from "@/components/ui/button";

export function ModeToggle() {
  const {setTheme, resolvedTheme} = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Darstellung wechseln"
      onClick={() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
      disabled={!mounted}
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Darstellung wechseln</span>
    </Button>
  );
}
