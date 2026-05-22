"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronUp, List } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { useCallback, useState } from "react";

import { EarthquakeMap } from "@/components/earthquake-map";
import { EarthquakePanel } from "@/components/earthquake-panel";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type TimeRange = "hour" | "day" | "week" | "month";

export default function Home() {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [timeRange, setTimeRange] = useState<TimeRange>("hour");
	const [significant, setSignificant] = useState(false);
	const [showRings, setShowRings] = useState(true);
	const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

	const isMobile = useIsMobile();

	const feed = `${significant ? "significant" : "all"}_${timeRange}` as const;

	const handleSelect = useCallback(
		(id: string | null) => {
			setSelectedId(id);
			if (isMobile && id !== null) {
				setMobileSheetOpen(true);
			}
		},
		[isMobile],
	);

	const { data, isLoading, isFetching, refetch } = useQuery({
		...orpc.earthquake.getFeed.queryOptions({ input: { feed } }),
		placeholderData: keepPreviousData,
	});

	const features = data?.features ?? [];
	const isRefetching = isFetching && !isLoading;

	const panelProps = {
		features,
		selectedId,
		isRefetching,
		timeRange,
		significant,
		showRings,
		onSelect: handleSelect,
		onRefresh: refetch,
		onTimeRangeChange: setTimeRange,
		onSignificantChange: setSignificant,
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
						<List className="size-4 shrink-0" aria-hidden />
						<span>Earthquakes</span>
						<span
							className="text-primary-foreground/90 inline-flex items-baseline gap-px text-[11px] tabular-nums"
							aria-hidden
						>
							<span>(</span>
							<NumberFlow
								locales="en-US"
								format={{ maximumFractionDigits: 0, useGrouping: true }}
								value={features.length}
							/>
							<span>)</span>
						</span>
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
