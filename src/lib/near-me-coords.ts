"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "fissol-earthquakes";
const UPDATE_EVENT = "fissol:near-me-coords-changed";

export type NearMeCoords = { lat: number; lng: number };

function parseCoords(raw: string | null): NearMeCoords | null {
	if (!raw) return null;
	try {
		const p = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
		if (
			typeof p.lat === "number" &&
			Number.isFinite(p.lat) &&
			typeof p.lng === "number" &&
			Number.isFinite(p.lng)
		) {
			return { lat: p.lat, lng: p.lng };
		}
	} catch (error) {
		console.error("Failed to read near-me coordinates from storage:", error);
	}
	return null;
}

// useSyncExternalStore requires a stable snapshot between renders; cache the
// parsed value and only re-parse when the raw string actually changed.
let cachedRaw: string | null = "";
let cachedSnapshot: NearMeCoords | null = null;

function getSnapshot(): NearMeCoords | null {
	const raw = window.localStorage.getItem(STORAGE_KEY);
	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedSnapshot = parseCoords(raw);
	}
	return cachedSnapshot;
}

function getServerSnapshot(): NearMeCoords | null {
	// localStorage isn't available on the server; rendering the same "no coords"
	// snapshot during hydration prevents a server/client markup mismatch.
	return null;
}

function subscribe(callback: () => void): () => void {
	window.addEventListener("storage", callback);
	window.addEventListener(UPDATE_EVENT, callback);
	return () => {
		window.removeEventListener("storage", callback);
		window.removeEventListener(UPDATE_EVENT, callback);
	};
}

export function writeNearMeCoordsToStorage(coords: NearMeCoords): void {
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ lat: coords.lat, lng: coords.lng }),
		);
	} catch (error) {
		// Common causes: storage disabled, private browsing, quota exceeded.
		console.error("Failed to persist near-me coordinates:", error);
	}
}

/**
 * User's last known location, persisted to localStorage.
 * Returns null on the server and during hydration, then syncs from storage.
 */
export function useNearMeCoords(): [
	NearMeCoords | null,
	(coords: NearMeCoords) => void,
] {
	const coords = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	const setCoords = useCallback((next: NearMeCoords) => {
		writeNearMeCoordsToStorage(next);
		// storage events only fire in *other* tabs; notify this tab explicitly.
		window.dispatchEvent(new Event(UPDATE_EVENT));
	}, []);

	return [coords, setCoords];
}
