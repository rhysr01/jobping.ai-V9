"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import CustomButton from "./CustomButton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface SimilarMatch {
	job_hash: string;
	title: string;
	company: string;
	location: string;
	job_url: string;
	match_score: number;
	match_reason: string;
}

interface JobClosedModalProps {
	isOpen: boolean;
	onClose: () => void;
	originalJob: {
		title: string;
		company: string;
		location: string;
	};
	similarMatches: SimilarMatch[];
	message: string;
}

export default function JobClosedModal({
	isOpen,
	onClose,
	originalJob,
	similarMatches,
	message,
}: JobClosedModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800"
				aria-describedby="job-closed-description"
			>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
							<AlertTriangle className="w-6 h-6 text-warning" />
						</div>
						<div>
							<DialogTitle className="text-xl font-bold text-white">
								Job No Longer Available
							</DialogTitle>
							<DialogDescription className="text-sm text-zinc-400 mt-1">
								{originalJob.company} • {originalJob.title}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-6">
					<p className="text-zinc-300">{message}</p>

					{/* Similar Matches */}
					<div className="space-y-4">
						{similarMatches.map((match) => (
							<motion.div
								key={match.job_hash}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700 hover:border-brand-500/50 transition-colors"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<h3 className="font-semibold text-white mb-1">
											{match.title}
										</h3>
										<p className="text-sm text-zinc-400 mb-2">
											{match.company} • {match.location}
										</p>
										<p className="text-xs text-zinc-500 line-clamp-2">
											{match.match_reason}
										</p>
										<div className="mt-2 flex items-center gap-2">
											<span className="text-xs px-2 py-1 rounded bg-brand-500/20 text-brand-300">
												{match.match_score}% Match
											</span>
										</div>
									</div>
									<CustomButton
										onClick={() => {
											window.open(
												match.job_url,
												"_blank",
												"noopener,noreferrer",
											);
										}}
										variant="primary"
										size="sm"
									>
										Apply →
									</CustomButton>
								</div>
							</motion.div>
						))}
					</div>

					{similarMatches.length === 0 && (
						<p className="text-zinc-400 text-center py-8">
							No similar matches found. Check back later for new
							opportunities!
						</p>
					)}
				</div>

				<DialogFooter>
					<CustomButton onClick={onClose} variant="secondary">
						Close
					</CustomButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
