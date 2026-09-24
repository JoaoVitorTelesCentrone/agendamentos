import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-[pulse_1.8s_ease-in-out_infinite] rounded-2xl bg-gradient-to-r from-muted via-muted/55 to-muted bg-[length:200%_100%]", className)}
      {...props}
    />
  )
}

export { Skeleton }
