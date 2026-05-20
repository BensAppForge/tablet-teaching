import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { FooterInfoProvider } from "@/context/FooterInfoContext";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";

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
	applicationName: "Tablet Teaching",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Tablet Teaching",
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: "/app-icon.svg",
		apple: "/app-icon.svg",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#08111f" },
	],
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
				<ThemeProvider>
					<AuthProvider>
						<FooterInfoProvider>
							<AppShell>{children}</AppShell>
							<Toaster richColors closeButton position="top-center" />
						</FooterInfoProvider>
					</AuthProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
