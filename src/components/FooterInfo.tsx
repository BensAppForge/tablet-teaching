"use client";

import React from "react";
import { Info } from "lucide-react";
import { useFooterInfo } from "@/context/FooterInfoContext";
import { motion, AnimatePresence } from "framer-motion";

const FooterInfo: React.FC = () => {
	const { footerInfo } = useFooterInfo();

	return (
		<div className="flex items-center justify-center min-w-[200px] h-full">
			<AnimatePresence mode="wait">
				{footerInfo ? (
					<motion.div
						key="info"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="text-sm flex items-center space-x-2"
					>
						<span>{footerInfo}</span>
					</motion.div>
				) : (
					<motion.div
						key="empty"
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.5 }}
						exit={{ opacity: 0 }}
						className="text-sm flex items-center space-x-2 text-muted-foreground"
					>
						<Info className="h-4 w-4" />
						<span>Wichtige Infos</span>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default FooterInfo;
