# Routing Cheatsheet for Next.js Static Export

## Query Parameters Pattern

### File Structure

```
src/app/
  └── route-name/
      └── page.tsx      // Static page component
src/components/
  └── RouteNameClient.tsx  // Client component with useSearchParams
```

### Static Page (page.tsx)

```tsx
import RouteNameClient from "@/components/RouteNameClient";

export default function RoutePage() {
	return <RouteNameClient />;
}
```

### Client Component

```tsx
"use client";

import { useSearchParams } from "next/navigation";

const RouteNameClient = () => {
	const searchParams = useSearchParams();
	const id = searchParams.get("id");

	// Use id to fetch data
};
```

### Navigation

```tsx
// Using router
router.push(`/route-name?id=${id}`);

// Using Link
<Link href={`/route-name?id=${id}`}>View Item</Link>;
```

## Common Patterns

### Multiple Parameters

```tsx
// URL: /search?category=books&sort=newest
const category = searchParams.get("category");
const sort = searchParams.get("sort");
```

### Optional Parameters

```tsx
const id = searchParams.get("id");
if (id) {
	// Fetch specific item
} else {
	// Show list view
}
```

### Default Values

```tsx
const page = searchParams.get("page") || "1";
const pageSize = searchParams.get("size") || "10";
```

## Common Issues

1. **Missing Parameters**: Always check if parameters exist before using them
2. **Type Conversion**: Query params are always strings - convert as needed
   ```tsx
   const page = parseInt(searchParams.get("page") || "1", 10);
   ```
3. **URL Encoding**: Use `encodeURIComponent` for values that may contain special characters
   ```tsx
   router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
   ```

## Best Practices

1. Keep URL parameters simple and limited to necessary data
2. Handle all error states (loading, missing data, fetch errors)
3. Consider implementing a custom hook for repetitive parameter handling
