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
	ShieldAlert,
	Waves,
} from "lucide-react";
import { Activity, memo, useCallback, useMemo } from "react";
import { VList } from "virtua";

import type { TimeRange } from "@/app/page";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EarthquakeFeature } from "@/server/routers/earthquake";

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
	onPick,
}: {
	feature: EarthquakeFeature;
	isSelected: boolean;
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
								<span className="text-muted-foreground/80" aria-hidden>
									·
								</span>
								<span className="whitespace-nowrap tabular-nums">
									{depth.toFixed(1)} km
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

function EarthquakeDetail({ feature }: { feature: EarthquakeFeature }) {
	const props = feature.properties;
	const [longitude, latitude, depth] = feature.geometry.coordinates;
	const time = props.time ? new Date(props.time) : null;
	const updated = props.updated ? new Date(props.updated) : null;

	const DetailRow = ({
		icon: Icon,
		label,
		value,
	}: {
		icon: React.ElementType;
		label: string;
		value: React.ReactNode;
	}) => (
		<div className="flex items-center gap-2 py-1.5">
			<Icon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="ml-auto text-xs font-medium">{value}</span>
		</div>
	);

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

function FeedControls({
	timeRange,
	significant,
	onTimeRangeChange,
	onSignificantChange,
}: {
	timeRange: TimeRange;
	significant: boolean;
	onTimeRangeChange: (v: TimeRange) => void;
	onSignificantChange: (v: boolean) => void;
}) {
	const ranges: TimeRange[] = ["hour", "day", "week", "month"];

	return (
		<div className="flex items-center gap-2 border-b px-3 py-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
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

			<div className="bg-muted ml-auto flex rounded-sm p-0.5">
				<button
					type="button"
					onClick={() => onSignificantChange(false)}
					className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors ${!significant ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
				>
					All
				</button>
				<button
					type="button"
					onClick={() => onSignificantChange(true)}
					className={`rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors ${significant ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
				>
					Significant
				</button>
			</div>
		</div>
	);
}

export function EarthquakePanel({
	features,
	selectedId,
	isRefetching,
	timeRange,
	significant,
	showRings,
	onSelect,
	onRefresh,
	onTimeRangeChange,
	onSignificantChange,
	onShowRingsChange,
}: {
	features: EarthquakeFeature[];
	selectedId: string | null;
	isRefetching: boolean;
	timeRange: TimeRange;
	significant: boolean;
	showRings: boolean;
	onSelect: (id: string | null) => void;
	onRefresh: () => void;
	onTimeRangeChange: (v: TimeRange) => void;
	onSignificantChange: (v: boolean) => void;
	onShowRingsChange: (v: boolean) => void;
}) {
	const featureById = useMemo(() => {
		const m = new Map<string, EarthquakeFeature>();
		for (const f of features) m.set(f.id, f);
		return m;
	}, [features]);

	const selectedFeature =
		selectedId !== null ? (featureById.get(selectedId) ?? null) : null;

	const sortedFeatures = useMemo(() => {
		return [...features].sort((a, b) => {
			const aTime = a.properties.time ?? 0;
			const bTime = b.properties.time ?? 0;
			return bTime - aTime;
		});
	}, [features]);

	const pickEarthquake = useCallback((id: string) => onSelect(id), [onSelect]);

	return (
		<div className="flex h-full flex-col bg-card">
			<div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<ActivityIcon className="text-primary size-4 shrink-0" />
					<h2 className="truncate text-sm font-medium">Earthquakes</h2>
					<span
						className="text-muted-foreground inline-flex min-h-5 shrink-0 items-baseline gap-px text-xs tabular-nums"
						aria-label={`${features.length} earthquakes in list`}
					>
						<span aria-hidden>(</span>
						<NumberFlow
							locales="en-US"
							format={{ maximumFractionDigits: 0, useGrouping: true }}
							value={features.length}
						/>
						<span aria-hidden>)</span>
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onShowRingsChange(!showRings)}
						title={showRings ? "Hide rings" : "Show rings"}
						className="size-7 shrink-0"
					>
						{showRings ? (
							<Circle className="size-3.5 fill-current" />
						) : (
							<Circle className="size-3.5" />
						)}
					</Button>
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
					</Button>
				</div>
			</div>

			<div className="relative min-h-0 flex-1 overflow-hidden">
				<div className="absolute inset-0 min-h-0">
					<Activity mode={selectedFeature ? "hidden" : "visible"}>
						<div className="flex h-full min-h-0 flex-col overflow-hidden">
							<FeedControls
								timeRange={timeRange}
								significant={significant}
								onTimeRangeChange={onTimeRangeChange}
								onSignificantChange={onSignificantChange}
							/>
							<div className="min-h-0 flex-1 overflow-hidden">
								{sortedFeatures.length > 0 ? (
									<VList className="h-full" data={sortedFeatures} itemSize={72}>
										{(feature) => (
											<EarthquakeListItem
												key={feature.id}
												feature={feature}
												isSelected={selectedId === feature.id}
												onPick={pickEarthquake}
											/>
										)}
									</VList>
								) : (
									<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
										<ActivityIcon className="text-muted-foreground size-8" />
										<p className="text-muted-foreground text-sm">
											No earthquakes found
										</p>
										{significant && (
											<p className="text-muted-foreground max-w-[200px] text-xs">
												Significant earthquakes are rare. Try a longer time
												range.
											</p>
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
