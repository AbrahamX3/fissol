"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EarthquakeMap } from "@/components/earthquake-map";
import {
	EarthquakePanel,
	type ListMode,
	type TabCounts,
} from "@/components/earthquake-panel";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	readNearMeCoordsFromStorage,
	writeNearMeCoordsToStorage,
} from "@/lib/near-me-coords";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type TimeRange = "hour" | "day" | "week" | "month";

const NEAR_ME_RADIUS_KM = 500;
const NEAR_ME_QUERY_LIMIT = 5000;

function startTimeISOForEarthquakeRange(timeRange: TimeRange): string {
	const d = new Date();
	if (timeRange === "hour") d.setHours(d.getHours() - 1);
	else if (timeRange === "day") d.setDate(d.getDate() - 1);
	else if (timeRange === "week") d.setDate(d.getDate() - 7);
	else d.setMonth(d.getMonth() - 1);
	return d.toISOString();
}

export default function Home() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [timeRange, setTimeRange] = useState<TimeRange>("hour");
	const [listMode, setListMode] = useState<ListMode>("all");
	const [nearMeCoords, setNearMeCoords] = useState<{
		lat: number;
		lng: number;
	} | null>(() => readNearMeCoordsFromStorage());

	const [showRings, setShowRings] = useState(true);
	const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

	const isMobile = useIsMobile();

	const allFeed = `all_${timeRange}` as const;
	const significantFeed = `significant_${timeRange}` as const;

	const nearMeStartISO = useMemo(
		() => startTimeISOForEarthquakeRange(timeRange),
		[timeRange],
	);

	const allFeedQuery = useQuery({
		...orpc.earthquake.getFeed.queryOptions({ input: { feed: allFeed } }),
		placeholderData: keepPreviousData,
	});

	const significantFeedQuery = useQuery({
		...orpc.earthquake.getFeed.queryOptions({
			input: { feed: significantFeed },
		}),
		placeholderData: keepPreviousData,
	});

	const nearMeQuery = useQuery({
		...orpc.earthquake.query.queryOptions({
			input: {
				starttime: nearMeStartISO,
				latitude: nearMeCoords?.lat ?? 0,
				longitude: nearMeCoords?.lng ?? 0,
				maxradiuskm: NEAR_ME_RADIUS_KM,
				limit: NEAR_ME_QUERY_LIMIT,
			},
		}),
		enabled: nearMeCoords !== null,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		if (listMode === "nearMe" && nearMeCoords === null) {
			setListMode("all");
		}
	}, [listMode, nearMeCoords]);

	const handleSelect = useCallback(
		(id: string | null) => {
			setSelectedId(id);
			if (isMobile && id !== null) {
				setMobileSheetOpen(true);
			}
		},
		[isMobile],
	);

	const handleUserLocated = useCallback(
		({ latitude, longitude }: { latitude: number; longitude: number }) => {
			const next = { lat: latitude, lng: longitude };
			setNearMeCoords(next);
			writeNearMeCoordsToStorage(next);
			setListMode("nearMe");
		},
		[],
	);

	const handleListModeChange = useCallback((mode: ListMode) => {
		setListMode(mode);
	}, []);

	const features = useMemo(() => {
		if (listMode === "nearMe") return nearMeQuery.data?.features ?? [];
		if (listMode === "significant")
			return significantFeedQuery.data?.features ?? [];
		return allFeedQuery.data?.features ?? [];
	}, [
		listMode,
		allFeedQuery.data?.features,
		significantFeedQuery.data?.features,
		nearMeQuery.data?.features,
	]);

	const tabCounts = useMemo((): TabCounts => {
		return {
			all: allFeedQuery.data?.features.length,
			significant: significantFeedQuery.data?.features.length,
			nearMe: nearMeCoords ? nearMeQuery.data?.features.length : undefined,
		};
	}, [
		allFeedQuery.data?.features.length,
		significantFeedQuery.data?.features.length,
		nearMeQuery.data?.features.length,
		nearMeCoords,
	]);

	const isLoading =
		listMode === "nearMe"
			? nearMeQuery.isLoading
			: listMode === "significant"
				? significantFeedQuery.isLoading
				: allFeedQuery.isLoading;

	const isRefetching =
		listMode === "nearMe"
			? nearMeQuery.isFetching && !nearMeQuery.isLoading
			: listMode === "significant"
				? significantFeedQuery.isFetching && !significantFeedQuery.isLoading
				: allFeedQuery.isFetching && !allFeedQuery.isLoading;

	const refetchActive = useCallback(() => {
		void allFeedQuery.refetch();
		void significantFeedQuery.refetch();
		if (nearMeCoords) void nearMeQuery.refetch();
	}, [allFeedQuery, significantFeedQuery, nearMeQuery, nearMeCoords]);

	const canShowNearMe = nearMeCoords !== null;

	const panelProps = {
		features,
		selectedId,
		isRefetching,
		timeRange,
		listMode,
		nearMeRadiusKm: NEAR_ME_RADIUS_KM,
		canShowNearMe,
		nearMeCenter: listMode === "nearMe" ? nearMeCoords : null,
		tabCounts,
		showRings,
		onSelect: handleSelect,
		onRefresh: refetchActive,
		onTimeRangeChange: setTimeRange,
		onListModeChange: handleListModeChange,
		onShowRingsChange: setShowRings,
	};

	return (
		<div className="relative h-full w-full">
			{isMobile ? (
				<div className="relative h-full w-full">
					<EarthquakeMap
						features={features}
						selectedId={selectedId}
						showRings={showRings}
						onSelect={handleSelect}
						onUserLocated={handleUserLocated}
						onOpenEarthquakePanel={() => setMobileSheetOpen(true)}
					/>

					<Button
						type="button"
						variant="default"
						size="sm"
						className={cn(
							"fixed left-1/2 z-50 h-11 -translate-x-1/2 gap-1.5 rounded-full border px-4 shadow-lg",
							"bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
							mobileSheetOpen && "pointer-events-none opacity-0",
						)}
						aria-expanded={mobileSheetOpen}
						aria-controls="earthquake-sheet"
						aria-label="Open earthquake list"
						onClick={() => setMobileSheetOpen(true)}
					>
						<ChevronUp className="size-4 shrink-0 opacity-90" aria-hidden />
						<Activity className="size-4 shrink-0" aria-hidden />
						<span>Fissol</span>
					</Button>

					<Drawer
						open={mobileSheetOpen}
						onOpenChange={setMobileSheetOpen}
						shouldScaleBackground={false}
					>
						<DrawerContent
							id="earthquake-sheet"
							className="flex max-h-[90dvh] flex-col gap-0 border-t p-0"
						>
							<DrawerTitle className="sr-only">
								Earthquakes list and filters
							</DrawerTitle>
							<div className="bg-card flex h-[82dvh] max-h-[90dvh] flex-col overflow-hidden">
								<EarthquakePanel {...panelProps} />
							</div>
						</DrawerContent>
					</Drawer>
				</div>
			) : (
				<ResizablePanelGroup orientation="horizontal" className="h-full">
					<ResizablePanel
						defaultSize="52%"
						minSize="38%"
						className="overflow-hidden"
					>
						<EarthquakeMap
							features={features}
							selectedId={selectedId}
							showRings={showRings}
							onSelect={handleSelect}
							onUserLocated={handleUserLocated}
						/>
					</ResizablePanel>
					<ResizableHandle withHandle className="w-2" />
					<ResizablePanel
						defaultSize="48%"
						minSize="32%"
						maxSize="62%"
						className="overflow-hidden"
					>
						<EarthquakePanel {...panelProps} />
					</ResizablePanel>
				</ResizablePanelGroup>
			)}

			{isLoading && (
				<div className="bg-background/60 absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
					<div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
					<p className="text-muted-foreground text-sm font-medium">
						Loading earthquakes...
					</p>
				</div>
			)}
		</div>
	);
}
