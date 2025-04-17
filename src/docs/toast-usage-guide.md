# Toast Notification Guide

We use [Sonner](https://github.com/emilkowalski/sonner) for toast notifications throughout the application. This document outlines best practices for using toast notifications consistently.

## Quick Usage

Import the `toast` function from Sonner:

```tsx
import { toast } from "sonner";
```

## Basic Toast Types

### Success Notifications

Use for successful operations:

```tsx
toast.success("Der Test wurde erfolgreich gespeichert.");
```

### Error Notifications

Use for error states:

```tsx
toast.error("Fehler beim Laden der Tests.");
```

### Info Notifications

Use for informational updates:

```tsx
toast.info("Neue Funktion verfügbar.");
```

### Warning Notifications

Use for important warnings:

```tsx
toast.warning("Diese Aktion kann nicht rückgängig gemacht werden.");
```

## Additional Options

You can customize toasts with additional options:

```tsx
toast.success("Gespeichert", {
	description: "Der Test wurde erfolgreich gespeichert.",
	duration: 5000, // 5 seconds
	position: "bottom-right",
	action: {
		label: "Anzeigen",
		onClick: () => router.push(`/tests/${testId}`),
	},
});
```

## When to Use Toast Notifications

- **Success Confirmation**: After completing important operations
- **Error Feedback**: When an operation fails
- **Warnings**: Before potentially destructive actions
- **System Events**: When the system state changes (e.g., connection lost)

## Toast Notification Guidelines

1. **Keep messages short** - Toasts should be concise
2. **Use appropriate type** - Match the toast type to the message intent
3. **Maintain consistency** - Use similar wording for similar actions
4. **German language** - All toast messages should be in German to match the UI
5. **Avoid overuse** - Only show toasts for important information

## Implementation

The Sonner `<Toaster />` component is already integrated in the `src/app/layout.tsx` file with these settings:

```tsx
<Toaster richColors position="top-center" />
```
