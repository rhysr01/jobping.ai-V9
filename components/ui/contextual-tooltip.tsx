import { BrandIcons } from "./BrandIcons";
import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextualTooltipProps {
	content: string;
	children: React.ReactNode;
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	maxWidth?: number;
	showIcon?: boolean;
	variant?: "default" | "info" | "warning" | "success";
	className?: string;
}

export function ContextualTooltip({
	content,
	children,
	side = "top",
	maxWidth = 300,
	showIcon = false,
	variant = "default",
	className = ""
}: ContextualTooltipProps) {
	const variants = {
		default: "bg-zinc-900/95 border-zinc-700 text-zinc-100",
		info: "bg-blue-900/95 border-blue-700 text-info",
		warning: "bg-amber-900/95 border-amber-700 text-amber-100",
		success: "bg-emerald-900/95 border-emerald-700 text-emerald-100"
	};

	const iconVariants = {
		default: BrandIcons.Info,
		info: BrandIcons.Info,
		warning: BrandIcons.AlertCircle,
		success: BrandIcons.CheckCircle
	};

	const IconComponent = showIcon ? iconVariants[variant] : null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					{children}
				</TooltipTrigger>
				<TooltipContent
					side={side}
					className={cn(
						"max-w-sm px-3 py-2 text-sm shadow-lg backdrop-blur-sm rounded-lg border",
						variants[variant],
						className
					)}
					style={{ maxWidth }}
				>
					<div className="flex items-start gap-2">
						{IconComponent && (
							<IconComponent className="w-4 h-4 mt-0.5 flex-shrink-0" />
						)}
						<div className="flex-1">
							{content}
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Smart tooltip that adapts to user behavior
interface SmartTooltipProps extends Omit<ContextualTooltipProps, 'showIcon'> {
	trigger: 'hover' | 'focus' | 'click';
	autoHide?: boolean;
	delay?: number;
}

export function SmartTooltip({
	trigger = 'hover',
	autoHide = true,
	delay = 300,
	...props
}: SmartTooltipProps) {
	return (
		<ContextualTooltip
			{...props}
			showIcon={false}
			className="data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
		/>
	);
}

// Inline help system
interface InlineHelpProps {
	text: string;
	variant?: "subtle" | "prominent";
	className?: string;
}

export function InlineHelp({
	text,
	variant = "subtle",
	className = ""
}: InlineHelpProps) {
	const styles = {
		subtle: "text-zinc-400 hover:text-zinc-300",
		prominent: "text-brand-400 hover:text-brand-300"
	};

	return (
		<ContextualTooltip content={text}>
			<button
				type="button"
				className={cn(
					"inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors",
					styles[variant],
					className
				)}
				aria-label="Help"
			>
				<BrandIcons.Info className="w-4 h-4" />
			</button>
		</ContextualTooltip>
	);
}

// Progressive disclosure tooltip
interface ProgressiveTooltipProps extends ContextualTooltipProps {
	unlockCondition?: boolean;
	unlockMessage?: string;
}

export function ProgressiveTooltip({
	unlockCondition = false,
	unlockMessage = "Complete the previous step to unlock this help",
	...props
}: ProgressiveTooltipProps) {
	if (!unlockCondition) {
		return (
			<ContextualTooltip
				content={unlockMessage}
				showIcon={true}
				variant="warning"
			>
				{props.children}
			</ContextualTooltip>
		);
	}

	return <ContextualTooltip {...props} />;
}

// Contextual guidance system
interface GuidanceTooltipProps {
	step: number;
	totalSteps: number;
	content: string;
	isCompleted: boolean;
	children: React.ReactNode;
}

export function GuidanceTooltip({
	step,
	totalSteps,
	content,
	isCompleted,
	children
}: GuidanceTooltipProps) {
	const variant = isCompleted ? "success" : "info";
	const iconText = isCompleted ? "✓" : `${step}/${totalSteps}`;

	return (
		<ContextualTooltip
			content={`${iconText} ${content}`}
			variant={variant}
			showIcon={true}
		>
			{children}
		</ContextualTooltip>
	);
}