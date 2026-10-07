"use client";

import NumberFlow from "@number-flow/react";
import { format, formatDistanceToNow } from "date-fns";
import {
	Activity as ActivityIcon,
	ArrowLeftIcon,
	ArrowUpDown,
	Calendar,
	CheckIcon,
	ChevronDown,
	Circle,
	Clock,
	ExternalLink,
	Layers,
	Loader2,
	MapPin,
	RefreshCw,
	Ruler,
	SearchIcon,
	ShieldAlert,
	Waves,
	X,
} from "lucide-react";
import { Activity, memo, useCallback, useMemo, useState } from "react";
import { VList } from "virtua";

import type { TimeRange } from "@/app/page";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { sortFeatures, type SortOrder } from "@/lib/earthquake";
import type { EarthquakeFeature } from "@/lib/earthquake";
import { haversineDistanceKm } from "@/lib/geo";

export type ListMode = "all" | "significant" | "nearMe";

function getMagnitudeColor(mag: number | null): string {
	if (mag === null)
		return "bg-muted text-foreground ring-1 ring-inset ring-border";

	if (mag < 2.0)
		return "bg-muted text-foreground ring-1 ring-inset ring-border";

	if (mag < 3.0) return "bg-emerald-500 text-white";

	if (mag < 4.0) return "bg-lime-500 text-black";

	if (mag < 5.0) return "bg-yellow-500 text-black";

	if (mag < 6.0) return "bg-orange-500 text-white";

	if (mag < 7.0) return "bg-red-500 text-white";

	return "bg-purple-600 text-white";
}

function getMagnitudeLabel(mag: number | null): string {
	if (mag === null) return "Unknown";

	if (mag < 2.0) return "Micro";

	if (mag < 3.0) return "Minor";

	if (mag < 4.0) return "Light";

	if (mag < 5.0) return "Moderate";

	if (mag < 6.0) return "Strong";

	if (mag < 7.0) return "Major";

	return "Great";
}

function MagnitudeBadge({ mag }: { mag: number | null }) {
	return (
		<div
			className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getMagnitudeColor(mag)}`}
		>
			{mag?.toFixed(1) ?? "?"}
		</div>
	);
}

const EarthquakeListItem = memo(function EarthquakeListItem({
	feature,
	isSelected,
	distanceKm,
	onPick,
}: {
	feature: EarthquakeFeature;
	isSelected: boolean;
	distanceKm?: number | null;
	onPick: (id: string) => void;
}) {
	const handleClick = useCallback(() => {
		onPick(feature.id);
	}, [feature.id, onPick]);

	const props = feature.properties;
	const time = props.time ? new Date(props.time) : null;
	const depth = feature.geometry.coordinates[2];

	return (
		<Tooltip delayDuration={300}>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={handleClick}
					title={props.place ?? undefined}
					className={`w-full border-b px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isSelected ? "bg-accent" : ""}`}
				>
					<div className="flex items-start gap-2.5">
						<div className="pt-0.5">
							<MagnitudeBadge mag={props.mag} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="line-clamp-2 text-left text-xs leading-snug font-medium">
								{props.place ?? "Unknown location"}
							</p>
							<div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
								{time ? (
									<span className="whitespace-nowrap tabular-nums">
										{formatDistanceToNow(time, { addSuffix: true })}
									</span>
								) : null}
								{time ? (
									<span className="text-muted-foreground/80" aria-hidden>
										·
									</span>
								) : null}
								<span className="whitespace-nowrap">
									{getMagnitudeLabel(props.mag)}
								</span>
								{distanceKm != null ? (
									<>
										<span className="text-muted-foreground/80" aria-hidden>
											·
										</span>
										<span className="whitespace-nowrap tabular-nums">
											{distanceKm < 100
												? `${distanceKm.toFixed(1)} km away`
												: `${Math.round(distanceKm)} km away`}
										</span>
									</>
								) : null}
								<span className="text-muted-foreground/80" aria-hidden>
									·
								</span>
								<span className="whitespace-nowrap tabular-nums">
									depth {depth.toFixed(1)} km
								</span>
							</div>
						</div>
					</div>
				</button>
			</TooltipTrigger>
			<TooltipContent side="left" align="start" className="max-w-sm text-left">
				{props.place ?? "Unknown location"}
			</TooltipContent>
		</Tooltip>
	);
});

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon: React.ElementType;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 py-1.5">
			<Icon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="ml-auto text-xs font-medium">{value}</span>
		</div>
	);
}

function EarthquakeDetail({ feature }: { feature: EarthquakeFeature }) {
	const props = feature.properties;
	const [longitude, latitude, depth] = feature.geometry.coordinates;
	const time = props.time ? new Date(props.time) : null;
	const updated = props.updated ? new Date(props.updated) : null;

	return (
		<div className="space-y-3 p-3">
			<div className="flex items-start gap-2.5">
				<MagnitudeBadge mag={props.mag} />
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-medium">{props.title}</h3>
					<p className="text-muted-foreground text-xs">{props.place}</p>
				</div>
			</div>

			<div className="border-t pt-2">
				<DetailRow
					icon={Layers}
					label="Magnitude Type"
					value={props.magType?.toUpperCase() ?? "N/A"}
				/>
				<DetailRow
					icon={Ruler}
					label="Depth"
					value={`${depth.toFixed(1)} km`}
				/>
				<DetailRow
					icon={MapPin}
					label="Coordinates"
					value={`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`}
				/>
				{time && (
					<DetailRow
						icon={Calendar}
						label="Date"
						value={format(time, "MMM d, yyyy")}
					/>
				)}
				{time && (
					<DetailRow
						icon={Clock}
						label="Time"
						value={format(time, "HH:mm:ss")}
					/>
				)}
				<DetailRow
					icon={ShieldAlert}
					label="Status"
					value={
						<span
							className={`capitalize ${props.status === "reviewed" ? "text-emerald-500" : "text-yellow-500"}`}
						>
							{props.status}
						</span>
					}
				/>
				{props.tsunami ? (
					<DetailRow
						icon={Waves}
						label="Tsunami Alert"
						value={<span className="text-red-500">Yes</span>}
					/>
				) : null}
				{props.felt !== null && (
					<DetailRow
						icon={ActivityIcon}
						label="Felt Reports"
						value={props.felt.toLocaleString()}
					/>
				)}
				{props.sig !== null && (
					<DetailRow
						icon={ArrowUpDown}
						label="Significance"
						value={props.sig.toLocaleString()}
					/>
				)}
				{updated && (
					<DetailRow
						icon={Clock}
						label="Updated"
						value={formatDistanceToNow(updated, { addSuffix: true })}
					/>
				)}
			</div>

			{props.url && (
				<a
					href={props.url}
					target="_blank"
					rel="noopener noreferrer"
					className="border-t pt-2 flex items-center gap-1 text-xs text-primary underline"
				>
					<ExternalLink className="size-3" />
					View full report on USGS
				</a>
			)}
		</div>
	);
}

const timeRangeLabels: Record<TimeRange, string> = {
	hour: "Past Hour",
	day: "Past Day",
	week: "Past Week",
	month: "Past Month",
};

export type TabCounts = {
	all?: number;
	significant?: number;
	nearMe?: number;
};

function TabCountBadge({ count, active }: { count?: number; active: boolean }) {
	if (count === undefined) return null;

	return (
		<span
			className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 py-px text-[9px] leading-none font-semibold tabular-nums ${
				active
					? "bg-primary/15 text-foreground"
					: "bg-muted-foreground/15 text-muted-foreground"
			}`}
			aria-hidden
		>
			<NumberFlow
				locales="en-US"
				format={{ maximumFractionDigits: 0, useGrouping: true }}
				value={count}
			/>
		</span>
	);
}

function ListModeTab({
	label,
	count,
	active,
	title,
	onClick,
}: {
	label: string;
	count?: number;
	active: boolean;
	title?: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-sm px-1 py-1 text-[10px] font-medium transition-colors sm:px-1.5 sm:text-[11px] ${
				active
					? "bg-card text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground"
			}`}
		>
			<span className="truncate">{label}</span>
			<TabCountBadge count={count} active={active} />
		</button>
	);
}

const sortOrderLabels: Record<SortOrder, string> = {
	newest: "Newest",
	oldest: "Oldest",
	biggest: "Biggest",
	smallest: "Smallest",
	nearest: "Nearest to me",
	furthest: "Furthest from me",
};

const listModeSearchPlaceholder: Record<ListMode, string> = {
	all: "Search all earthquakes by place…",
	significant: "Search significant earthquakes by place…",
	nearMe: "Search nearby earthquakes by place…",
};

function ListSearchBar({
	listMode,
	value,
	onChange,
}: {
	listMode: ListMode;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="relative border-b px-3 py-2">
			<SearchIcon
				className="text-muted-foreground pointer-events-none absolute top-1/2 left-6 size-3.5 -translate-y-1/2"
				aria-hidden
			/>
			<Input
				type="text"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={listModeSearchPlaceholder[listMode]}
				aria-label={listModeSearchPlaceholder[listMode]}
				className="h-7 pr-7 pl-8"
			/>
			{value ? (
				<button
					type="button"
					onClick={() => onChange("")}
					title="Clear search"
					aria-label="Clear search"
					className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4.5 -translate-y-1/2"
				>
					<X className="size-3.5" />
				</button>
			) : null}
		</div>
	);
}

function FeedControls({
	timeRange,
	sortOrder,
	listMode,
	canShowNearMe,
	nearMeRadiusKm,
	tabCounts,
	onTimeRangeChange,
	onSortOrderChange,
	onListModeChange,
}: {
	timeRange: TimeRange;
	sortOrder: SortOrder;
	listMode: ListMode;
	canShowNearMe: boolean;
	nearMeRadiusKm: number;
	tabCounts: TabCounts;
	onTimeRangeChange: (v: TimeRange) => void;
	onSortOrderChange: (v: SortOrder) => void;
	onListModeChange: (v: ListMode) => void;
}) {
	const ranges: TimeRange[] = ["hour", "day", "week", "month"];

	return (
		<div className="flex items-center gap-2 border-b px-3 py-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-7 shrink-0 gap-1.5 text-xs"
					>
						{timeRangeLabels[timeRange]}
						<ChevronDown className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{ranges.map((r) => (
						<DropdownMenuItem
							key={r}
							onClick={() => onTimeRangeChange(r)}
							className="text-xs"
						>
							{timeRangeLabels[r]}
							{r === timeRange && <CheckIcon className="ml-auto size-3.5" />}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-7 shrink-0 gap-1 text-xs"
					>
						{sortOrderLabels[sortOrder]}
						<ChevronDown className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem
						onClick={() => onSortOrderChange("newest")}
						className="text-xs"
					>
						Newest
						{sortOrder === "newest" && (
							<CheckIcon className="ml-auto size-3.5" />
						)}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => onSortOrderChange("oldest")}
						className="text-xs"
					>
						Oldest
						{sortOrder === "oldest" && (
							<CheckIcon className="ml-auto size-3.5" />
						)}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => onSortOrderChange("biggest")}
						className="text-xs"
					>
						Biggest
						{sortOrder === "biggest" && (
							<CheckIcon className="ml-auto size-3.5" />
						)}
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => onSortOrderChange("smallest")}
						className="text-xs"
					>
						Smallest
						{sortOrder === "smallest" && (
							<CheckIcon className="ml-auto size-3.5" />
						)}
					</DropdownMenuItem>
					{canShowNearMe && (
						<>
							<DropdownMenuItem
								onClick={() => onSortOrderChange("nearest")}
								className="text-xs"
							>
								Nearest to me
								{sortOrder === "nearest" && (
									<CheckIcon className="ml-auto size-3.5" />
								)}
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => onSortOrderChange("furthest")}
								className="text-xs"
							>
								Furthest from me
								{sortOrder === "furthest" && (
									<CheckIcon className="ml-auto size-3.5" />
								)}
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="bg-muted flex min-w-0 flex-1 rounded-sm p-0.5">
				<ListModeTab
					label="All"
					count={tabCounts.all}
					active={listMode === "all"}
					onClick={() => onListModeChange("all")}
				/>
				<ListModeTab
					label="Significant"
					count={tabCounts.significant}
					active={listMode === "significant"}
					onClick={() => onListModeChange("significant")}
				/>
				{canShowNearMe ? (
					<ListModeTab
						label="Near me"
						count={tabCounts.nearMe}
						active={listMode === "nearMe"}
						title={
							listMode === "nearMe"
								? `Within about ${nearMeRadiusKm} km`
								: undefined
						}
						onClick={() => onListModeChange("nearMe")}
					/>
				) : null}
			</div>
		</div>
	);
}

export function EarthquakePanel({
	features,
	selectedId,
	isRefetching,
	timeRange,
	sortOrder,
	listMode,
	nearMeRadiusKm,
	canShowNearMe,
	nearMeCenter,
	tabCounts,
	onSelect,
	onRefresh,
	onTimeRangeChange,
	onSortOrderChange,
	onListModeChange,
	onShowRingsChange,
	showRings,
}: {
	features: EarthquakeFeature[];
	selectedId: string | null;
	isRefetching: boolean;
	timeRange: TimeRange;
	sortOrder: SortOrder;
	listMode: ListMode;
	/** Radius used for Near me USGS query (shown in toolbar). */
	nearMeRadiusKm: number;
	canShowNearMe: boolean;
	/** Distance sort + list row badges when Near me tab is selected */
	nearMeCenter: { lat: number; lng: number } | null;
	tabCounts: TabCounts;
	showRings: boolean;
	onSelect: (id: string | null) => void;
	onRefresh: () => void;
	onTimeRangeChange: (v: TimeRange) => void;
	onSortOrderChange: (v: SortOrder) => void;
	onListModeChange: (v: ListMode) => void;
	onShowRingsChange: (v: boolean) => void;
}) {
	const featureById = useMemo(() => {
		const m = new Map<string, EarthquakeFeature>();

		for (const f of features) m.set(f.id, f);

		return m;
	}, [features]);

	const selectedFeature =
		selectedId !== null ? (featureById.get(selectedId) ?? null) : null;

	// Each tab keeps its own search query so switching tabs preserves it.
	const [searches, setSearches] = useState<Record<ListMode, string>>({
		all: "",
		significant: "",
		nearMe: "",
	});

	const search = searches[listMode] ?? "";

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearches((prev) => ({ ...prev, [listMode]: value }));
		},
		[listMode],
	);

	const sortedFeatures = useMemo(() => {
		return sortFeatures(features, sortOrder, nearMeCenter);
	}, [features, sortOrder, nearMeCenter]);

	const query = search.trim().toLowerCase();

	const visibleFeatures = useMemo(() => {
		if (!query) return sortedFeatures;

		return sortedFeatures.filter((f) => {
			const text =
				f.properties.place ?? f.properties.title ?? f.properties.magType ?? "";

			return text.toLowerCase().includes(query);
		});
	}, [sortedFeatures, query]);

	const pickEarthquake = useCallback((id: string) => onSelect(id), [onSelect]);

	return (
		<div className="flex h-full flex-col bg-card">
			<div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<ActivityIcon className="text-primary size-4 shrink-0" aria-hidden />
					<h2 className="truncate text-sm font-semibold tracking-tight">
						Fissol
					</h2>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<ModeToggle variant="ghost" className="size-7" />
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onShowRingsChange(!showRings)}
								className="size-7 shrink-0"
							>
								{showRings ? (
									<Circle className="size-3.5 fill-current" />
								) : (
									<Circle className="size-3.5" />
								)}
								<span className="sr-only">
									{showRings ? "Hide reach rings" : "Show reach rings"}
								</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							{showRings ? "Hide reach rings" : "Show reach rings"}
						</TooltipContent>
					</Tooltip>
					<Tooltip delayDuration={300}>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onRefresh}
								disabled={isRefetching}
								className="size-7 shrink-0"
							>
								{isRefetching ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<RefreshCw className="size-3.5" />
								)}
								<span className="sr-only">Refresh earthquakes</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Refresh earthquakes</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<div className="relative min-h-0 flex-1 overflow-hidden">
				<div className="absolute inset-0 min-h-0">
					<Activity mode={selectedFeature ? "hidden" : "visible"}>
						<div className="flex h-full min-h-0 flex-col overflow-hidden">
							<FeedControls
								timeRange={timeRange}
								sortOrder={sortOrder}
								listMode={listMode}
								canShowNearMe={canShowNearMe}
								nearMeRadiusKm={nearMeRadiusKm}
								tabCounts={tabCounts}
								onTimeRangeChange={onTimeRangeChange}
								onSortOrderChange={onSortOrderChange}
								onListModeChange={onListModeChange}
							/>
							<ListSearchBar
								listMode={listMode}
								value={search}
								onChange={handleSearchChange}
							/>
							<div className="min-h-0 flex-1 overflow-hidden">
								{visibleFeatures.length > 0 ? (
									<VList
										className="h-full"
										data={visibleFeatures}
										itemSize={72}
									>
										{(feature) => {
											const [lng, lat] = feature.geometry.coordinates;

											const distanceKm =
												listMode === "nearMe" && nearMeCenter
													? haversineDistanceKm(
															nearMeCenter.lat,
															nearMeCenter.lng,
															lat,
															lng,
														)
													: null;

											return (
												<EarthquakeListItem
													key={feature.id}
													feature={feature}
													isSelected={selectedId === feature.id}
													distanceKm={distanceKm}
													onPick={pickEarthquake}
												/>
											);
										}}
									</VList>
								) : (
									<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
										<ActivityIcon className="text-muted-foreground size-8" />
										<p className="text-muted-foreground text-sm">
											{query
												? "No earthquakes match your search"
												: "No earthquakes found"}
										</p>
										{query ? (
											<p className="text-muted-foreground max-w-[220px] text-xs">
												Try a different place name or clear the search.
											</p>
										) : (
											<>
												{listMode === "significant" && (
													<p className="text-muted-foreground max-w-[200px] text-xs">
														Significant earthquakes are rare. Try a longer time
														range.
													</p>
												)}
												{listMode === "nearMe" && canShowNearMe && (
													<p className="text-muted-foreground max-w-[220px] text-xs">
														No events in the last {timeRangeLabels[timeRange]}{" "}
														within about {nearMeRadiusKm}&nbsp;km. Try a longer
														time range or move the map and use locate again.
													</p>
												)}
											</>
										)}
									</div>
								)}
							</div>
						</div>
					</Activity>
				</div>
				{selectedFeature ? (
					<div className="bg-card absolute inset-0 z-1 flex min-h-0 flex-col overflow-hidden">
						<div className="border-b px-2 py-1.5">
							<Button
								variant="outline"
								size="sm"
								onClick={() => onSelect(null)}
								className="h-7 text-xs"
							>
								<ArrowLeftIcon className="size-3.5 shrink-0" /> Back to list
							</Button>
						</div>
						<div className="flex-1 overflow-y-auto">
							<EarthquakeDetail feature={selectedFeature} />
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
