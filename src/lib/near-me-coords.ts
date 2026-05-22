const STORAGE_KEY = "fissol-earthquakes";

export type NearMeCoords = { lat: number; lng: number };

export function readNearMeCoordsFromStorage(): NearMeCoords | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const p = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
		if (
			typeof p.lat === "number" &&
			Number.isFinite(p.lat) &&
			typeof p.lng === "number" &&
			Number.isFinite(p.lng)
		) {
			return { lat: p.lat, lng: p.lng };
		}
	} catch {
		console.error("Error reading near me coords from storage");
	}
	return null;
}

export function writeNearMeCoordsToStorage(coords: NearMeCoords): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ lat: coords.lat, lng: coords.lng }),
		);
	} catch {
		console.error("Error writing near me coords to storage");
	}
}
