import { motion } from "framer-motion";
import { BrandIcons } from "./BrandIcons";
import { cn } from "@/lib/utils";

interface FormStep {
	id: string;
	label: string;
	isCompleted: boolean;
	isCurrent: boolean;
	isValid: boolean;
	error?: string;
}

interface FormProgressProps {
	steps: FormStep[];
	currentStep: string;
	className?: string;
	showValidation?: boolean;
}

export function FormProgress({
	steps,
	currentStep,
	className = "",
	showValidation = true
}: FormProgressProps) {
	const currentIndex = steps.findIndex(step => step.id === currentStep);

	return (
		<div className={cn("w-full max-w-2xl mx-auto", className)}>
			{/* Progress Bar */}
			<div className="relative mb-8">
				{/* Background */}
				<div className="h-2 bg-zinc-700/50 rounded-full overflow-hidden">
					<motion.div
						className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
						initial={{ width: 0 }}
						animate={{
							width: `${((currentIndex + 1) / steps.length) * 100}%`
						}}
						transition={{ duration: 0.5, ease: "easeOut" }}
					/>
				</div>

				{/* Step Indicators */}
				<div className="absolute -top-3 left-0 right-0 flex justify-between">
					{steps.map((step, index) => {
						const IconComponent = step.isCompleted
							? BrandIcons.Check
							: step.isCurrent
								? BrandIcons.Target
								: BrandIcons.Target;

						return (
							<motion.div
								key={step.id}
								className={cn(
									"flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
									step.isCompleted
										? "bg-brand-500 border-brand-500 text-white"
										: step.isCurrent
											? "border-brand-500 text-brand-500 bg-black"
											: step.isValid
												? "border-zinc-500 text-zinc-500"
												: "border-zinc-600 text-zinc-600"
								)}
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ delay: index * 0.1 }}
							>
								{step.isCompleted ? (
									<IconComponent className="w-3 h-3" />
								) : (
									<span className="text-xs font-bold">{index + 1}</span>
								)}
							</motion.div>
						);
					})}
				</div>
			</div>

			{/* Step Labels */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				{steps.map((step, _index) => (
					<div key={step.id} className="text-center">
						<h3 className={cn(
							"text-sm font-medium transition-colors",
							step.isCompleted || step.isCurrent
								? "text-white"
								: "text-zinc-500"
						)}>
							{step.label}
						</h3>
						{showValidation && step.error && step.isCurrent && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-xs text-error mt-1"
							>
								{step.error}
							</motion.p>
						)}
					</div>
				))}
			</div>

			{/* Progress Text */}
			<div className="text-center">
				<p className="text-sm text-zinc-400">
					Step {currentIndex + 1} of {steps.length}
				</p>
				<p className="text-xs text-zinc-500 mt-1">
					{Math.round(((currentIndex + 1) / steps.length) * 100)}% complete
				</p>
			</div>
		</div>
	);
}

// Enhanced validation feedback
interface ValidationFeedbackProps {
	isValid: boolean;
	message: string;
	type: 'success' | 'error' | 'warning' | 'info';
	className?: string;
}

export function ValidationFeedback({
	isValid,
	message,
	type,
	className = ""
}: ValidationFeedbackProps) {
	const icons = {
		success: BrandIcons.CheckCircle,
		error: BrandIcons.Shield,
		warning: BrandIcons.AlertCircle,
		info: BrandIcons.Info
	};

	const colors = {
		success: "text-success bg-emerald-500/10 border-emerald-500/20",
		error: "text-error bg-red-500/10 border-red-500/20",
		warning: "text-warning bg-amber-500/10 border-amber-500/20",
		info: "text-info bg-blue-500/10 border-blue-500/20"
	};

	const IconComponent = icons[type];

	if (!isValid && type === 'error') {
		return null; // Don't show error feedback for valid fields
	}

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			className={cn(
				"flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
				colors[type],
				className
			)}
		>
			<IconComponent className="w-4 h-4 flex-shrink-0" />
			<span>{message}</span>
		</motion.div>
	);
}

// Smart form field with progressive disclosure
interface SmartFormFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
	help?: string;
	validation?: {
		isValid: boolean;
		message: string;
		type: 'success' | 'error' | 'warning' | 'info';
	};
	showAdvanced?: boolean;
	advancedContent?: React.ReactNode;
	className?: string;
}

export function SmartFormField({
	id,
	label,
	value,
	onChange,
	onBlur,
	placeholder,
	type = "text",
	required = false,
	help,
	validation,
	showAdvanced = false,
	advancedContent,
	className = ""
}: SmartFormFieldProps) {
	return (
		<motion.div
			className={cn("space-y-3", className)}
			layout
		>
			{/* Label with help indicator */}
			<div className="flex items-center justify-between">
				<label htmlFor={id} className="text-base font-bold text-white flex items-center gap-2">
					{label}
					{required && <span className="text-error">*</span>}
				</label>
				{help && (
					<div className="text-xs text-zinc-400 cursor-help" title={help}>
						<BrandIcons.Info className="w-4 h-4" />
					</div>
				)}
			</div>

			{/* Input field */}
			<input
				id={id}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				placeholder={placeholder}
				className={cn(
					"w-full px-4 py-4 min-h-[56px] bg-black/50 border-2 rounded-xl",
					"text-white placeholder-zinc-400 transition-all",
					validation?.isValid === false
						? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
						: validation?.isValid === true
							? "border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/30"
							: "border-zinc-700 hover:border-zinc-600 focus:border-brand-500 focus:ring-brand-500/30",
					"focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-black"
				)}
				aria-invalid={validation?.isValid === false}
				aria-describedby={help ? `${id}-help` : undefined}
			/>

			{/* Help text */}
			{help && (
				<p id={`${id}-help`} className="text-sm text-zinc-400">
					{help}
				</p>
			)}

			{/* Validation feedback */}
			{validation && (
				<ValidationFeedback
					isValid={validation.isValid}
					message={validation.message}
					type={validation.type}
				/>
			)}

			{/* Advanced content with progressive disclosure */}
			{showAdvanced && advancedContent && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.3 }}
					className="overflow-hidden"
				>
					{advancedContent}
				</motion.div>
			)}
		</motion.div>
	);
}