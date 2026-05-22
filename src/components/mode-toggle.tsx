"use client";

import { CheckIcon, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ModeToggleProps = {
	variant?: ComponentProps<typeof Button>["variant"];
	size?: ComponentProps<typeof Button>["size"];
	className?: string;
};

export function ModeToggle({
	variant = "outline",
	size = "icon",
	className,
}: ModeToggleProps) {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenu>
			<Tooltip delayDuration={300}>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant={variant}
							size={size}
							className={cn("relative shrink-0", className)}
						>
							<Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
							<Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
							<span className="sr-only">Theme</span>
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">Theme</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-32">
				<DropdownMenuItem onClick={() => setTheme("light")} className="text-xs">
					<Sun className="size-3.5" />
					Light
					{theme === "light" && <CheckIcon className="ml-auto size-3.5" />}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")} className="text-xs">
					<Moon className="size-3.5" />
					Dark
					{theme === "dark" && <CheckIcon className="ml-auto size-3.5" />}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className="text-xs"
				>
					<Monitor className="size-3.5" />
					System
					{theme === "system" && <CheckIcon className="ml-auto size-3.5" />}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
