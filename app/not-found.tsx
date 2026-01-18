import Footer from "../components/sections/footer";
import Header from "../components/sections/header";
import CustomButton from "../components/ui/CustomButton";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-zinc-950 flex flex-col">
			<Header />
			<main className="flex-1 flex items-center justify-center p-4">
				<div className="text-center max-w-md mx-auto">
					<h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tighter">
						404
					</h1>
					<p className="text-xl md:text-2xl text-zinc-300 mb-2 font-medium">
						Page not found
					</p>
					<p className="text-zinc-400 mb-8 leading-relaxed">
						The visa-first job board for the next generation of builders.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<CustomButton href="/" variant="primary" size="lg">
							Go Home
						</CustomButton>
						<CustomButton
							href="/signup/free?city=Berlin"
							variant="secondary"
							size="lg"
						>
							See Berlin Jobs
						</CustomButton>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
}
