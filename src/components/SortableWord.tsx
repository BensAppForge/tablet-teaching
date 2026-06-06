"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";

interface SortableSlots {
	attributes: React.HTMLAttributes<HTMLElement>;
	listeners: React.HTMLAttributes<HTMLElement>;
	isDragging: boolean;
}

interface SortableWordProps {
	id: string | number;
	disabled?: boolean;
	children: (slots: SortableSlots) => React.ReactNode;
}

// @dnd-kit's CSS.Transform.toString helper inlined to avoid pulling in
// @dnd-kit/utilities as an explicit dependency. Produces the same output:
// translate3d for position + scaleX/scaleY for list-shrink animations.
function transformToCss(
	transform: { x: number; y: number; scaleX?: number; scaleY?: number } | null
): string | undefined {
	if (!transform) return undefined;
	const sx = transform.scaleX ?? 1;
	const sy = transform.scaleY ?? 1;
	return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${sx}) scaleY(${sy})`;
}

/**
 * Render-prop wrapper around @dnd-kit's useSortable. Exposes listeners +
 * attributes so consumers can spread them on either the whole item (kid
 * worksheet — anywhere on a word triggers drag) or a dedicated handle
 * (teacher editor — only the grip drags, so the Input stays typeable).
 */
export const SortableWord: React.FC<SortableWordProps> = ({
	id,
	disabled,
	children,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled });

	const style: React.CSSProperties = {
		transform: transformToCss(transform),
		transition,
		zIndex: isDragging ? 30 : undefined,
		opacity: isDragging ? 0.85 : 1,
		// Prevent the browser from claiming touch gestures (scroll/pan) on
		// the sortable item — without this, iPad scroll wins over drag.
		touchAction: "none",
	};

	return (
		<div ref={setNodeRef} style={style}>
			{children({
				attributes: attributes as React.HTMLAttributes<HTMLElement>,
				listeners: (listeners ?? {}) as React.HTMLAttributes<HTMLElement>,
				isDragging,
			})}
		</div>
	);
};

export default SortableWord;
