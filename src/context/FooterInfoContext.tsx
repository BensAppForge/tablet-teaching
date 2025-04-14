"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of our context
interface FooterInfoContextType {
	footerInfo: string | null;
	updateFooterInfo: (info: string | null) => void;
}

// Create context with default values
const FooterInfoContext = createContext<FooterInfoContextType>({
	footerInfo: null,
	updateFooterInfo: () => {},
});

// Custom hook to use the footer info context
export const useFooterInfo = () => useContext(FooterInfoContext);

// Props for the provider component
interface FooterInfoProviderProps {
	children: ReactNode;
}

// Provider component
export const FooterInfoProvider: React.FC<FooterInfoProviderProps> = ({
	children,
}) => {
	const [footerInfo, setFooterInfo] = useState<string | null>(null);

	// Function to update the footer info
	const updateFooterInfo = (info: string | null) => {
		setFooterInfo(info);
	};

	// Value object that will be provided to consumers
	const value = {
		footerInfo,
		updateFooterInfo,
	};

	return (
		<FooterInfoContext.Provider value={value}>
			{children}
		</FooterInfoContext.Provider>
	);
};
