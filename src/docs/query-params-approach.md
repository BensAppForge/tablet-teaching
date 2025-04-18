# Routing with Query Parameters in Next.js Static Export

## Overview

This document describes the recommended approach for handling parameterized routes in Next.js applications with static export, especially when deployed to Firebase hosting.

## The Query Parameters Approach

For routes that need to handle variable IDs (like viewing or editing specific tests), we use static routes with query parameters:

```
/edit-test?id=xyz
/view-test?id=abc
/add-question?id=123
```

### Advantages

1. **Simplicity**: Simple implementation without complex configuration
2. **Development Ease**: No special handling needed for development
3. **Clean Build**: Straightforward build and deployment process
4. **Firebase Friendly**: Works perfectly with Firebase Hosting's static file serving

### Implementation Guide

#### 1. Static Page Component

Create a static page component that doesn't rely on route parameters:

```tsx
// src/app/edit-test/page.tsx
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Test bearbeiten - Tablet Teaching",
};

import EditTestStaticClient from "@/components/EditTestStaticClient";

export default function EditTestPage() {
	return <EditTestStaticClient />;
}
```

#### 2. Client Component with useSearchParams

Create a client component that reads parameters from the URL:

```tsx
// src/components/EditTestStaticClient.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const EditTestStaticClient = () => {
	const searchParams = useSearchParams();
	const testId = searchParams.get("id");
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Handle missing ID gracefully
	if (!testId) {
		return <div>Fehler: Keine Test-ID angegeben</div>;
	}

	useEffect(() => {
		// Fetch data using the ID from query params
		async function fetchData() {
			try {
				// Your data fetching logic here
				const result = await fetchTestById(testId);
				setData(result);
			} catch (err) {
				setError("Fehler beim Laden der Daten");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [testId]);

	// Render your component based on loading/error/data state
};
```

#### 3. Linking to the Page

When linking to these pages from other parts of your application:

```tsx
// In components that need to link to the edit page
import { useRouter } from "next/navigation";

const MyComponent = () => {
	const router = useRouter();

	const handleEdit = (id) => {
		router.push(`/edit-test?id=${id}`);
	};

	return <button onClick={() => handleEdit("test-123")}>Edit Test</button>;
};
```

Or with Next.js Link component:

```tsx
import Link from "next/link";

<Link href={`/edit-test?id=${testId}`}>Edit Test</Link>;
```

## Best Practices

1. **Always Check for ID**: Always validate the ID parameter exists before trying to use it
2. **Handle Loading States**: Show appropriate loading indicators while data is being fetched
3. **Error Handling**: Display user-friendly error messages when data can't be loaded
4. **Type Safety**: Use TypeScript to ensure type safety when working with query parameters

## Example: Adding a New Route

To add a new route for viewing student results:

1. Create a static page:

```tsx
// src/app/student-results/page.tsx
export default function StudentResultsPage() {
	return <StudentResultsClient />;
}
```

2. Create the client component:

```tsx
// src/components/StudentResultsClient.tsx
"use client";

import { useSearchParams } from "next/navigation";

const StudentResultsClient = () => {
	const searchParams = useSearchParams();
	const testId = searchParams.get("id");

	// Rest of the implementation
};
```

3. Link to it from other components:

```tsx
router.push(`/student-results?id=${testId}`);
```

## Conclusion

The query parameters approach offers a clean, simple way to handle parameterized routes in Next.js static exports deployed to Firebase hosting. It eliminates complex configuration requirements while maintaining all the functionality needed for a robust application.
