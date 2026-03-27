"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  if (!isMounted) {
    return (
        <Button variant="ghost" size="icon" disabled>
             <Sun className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    )
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      aria-label="Toggle theme"
      className={cn(
        "bg-transparent hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
        theme === 'light' 
          ? "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" 
          : "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
      )}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] block dark:hidden" />
      <Moon className="h-[1.2rem] w-[1.2rem] hidden dark:block" />
    </Button>
  )
}
