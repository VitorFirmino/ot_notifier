import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "cn"
import { Input } from "@components/ui/input"

function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input type={isVisible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
