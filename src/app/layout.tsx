import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModeToggle } from "@/components/ModeToggle";
import { AuthProvider } from "@/context/AuthContext";
import { FooterInfoProvider } from "@/context/FooterInfoContext";
import FooterAuthButton from "@/components/FooterAuthButton";
import FooterInfo from "@/components/FooterInfo";
import UserProfile from "@/components/UserProfile";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Tablet Teaching",
	description: "Sprachenlernen testen. Einfach. Digital. Sicher.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="de" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<AuthProvider>
					<FooterInfoProvider>
						<div className="flex flex-col min-h-screen">
							{/* Header - Changed to bg-primary and text-primary-foreground */}
							<header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 flex items-center justify-between">
								<div className="flex items-center font-semibold">
									{/* Placeholder Logo - Removed text-primary as we're using text-primary-foreground */}
									<svg
										width="30"
										height="30"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="mr-2"
									>
										<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
										<line x1="9" y1="3" x2="9" y2="21" />
									</svg>
									TABLET TEACHING
								</div>
								<div className="flex items-center gap-4">
									<UserProfile />
									<ModeToggle />
								</div>
							</header>

							{/* Main Content - Removed vertical centering */}
							<main className="flex-1 flex flex-col pt-0">{children}</main>

							{/* Footer - Changed to bg-primary and text-primary-foreground */}
							<footer className="sticky bottom-0 z-50 bg-primary text-primary-foreground p-4 flex items-center justify-between">
								<div>&copy; {new Date().getFullYear()} Bensappforge</div>
								<FooterInfo />
								<FooterAuthButton />
							</footer>
						</div>
					</FooterInfoProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
