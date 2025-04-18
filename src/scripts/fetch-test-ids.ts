/**
 * Utility script to fetch all test IDs from Firestore
 * Useful during development to find valid test IDs to use in the app
 *
 * Run with: npx tsx src/scripts/fetch-test-ids.ts
 */

import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../lib/firebase/config";

async function fetchAllTestIds() {
	try {
		console.log("Fetching all test IDs from Firestore...");

		const testsRef = collection(firestore, "tests");
		const snapshot = await getDocs(testsRef);

		console.log(`Found ${snapshot.size} tests:`);

		snapshot.docs.forEach((doc, index) => {
			const data = doc.data();
			console.log(
				`${index + 1}. ID: ${doc.id} | Title: ${
					data.title || "Untitled"
				} | Teacher: ${data.teacherId}`
			);
		});
	} catch (error) {
		console.error("Error fetching test IDs:", error);
	}
}

fetchAllTestIds();

/**
 * To use these IDs in your development:
 *
 * 1. Run this script to get valid test IDs
 * 2. Copy a test ID from the output
 * 3. Use the ID in query parameters like: /edit-test?id=YOUR_TEST_ID
 */
