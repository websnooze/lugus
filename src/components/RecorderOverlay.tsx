import {
	ArrowLeft,
	Camera,
	Display,
	Gear,
	SquareDashed,
	Stop,
	Video,
	Xmark,
} from "@gravity-ui/icons";
import {
	Button,
	Chip,
	Description,
	Label,
	ListBox,
	Select,
	Switch,
	Typography,
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useConverterStore } from "../store/converter";
import { usePreferencesStore } from "../store/preferences";
import {
	useRecorderStore,
	type CaptureMode,
	type CountdownOption,
	type FpsOption,
} from "../store/recorder";
import {
	FORMAT_OPTIONS,
	type OutputFormat,
	type QualityPreset,
} from "../types";
import { AnimatedNumber, AnimatedTime } from "./AnimatedNumber";
import { DimHole } from "./DimHole";
import { FloatingWidget } from "./FloatingWidget";
import { RegionDrawLayer } from "./RegionDrawLayer";

type FocusRect = { x: number; y: number; width: number; height: number };

export function RecorderOverlay() {
	const { t } = useTranslation();
	const [showOutput, setShowOutput] = useState(false);
	const [shotBusy, setShotBusy] = useState(false);
	const setView = usePreferencesStore((s) => s.setView);

	const status = useRecorderStore((s) => s.status);
	const mode = useRecorderStore((s) => s.mode);
	const fps = useRecorderStore((s) => s.fps);
	const countdown = useRecorderStore((s) => s.countdown);
	const showCursor = useRecorderStore((s) => s.showCursor);
	const autoConvert = useRecorderStore((s) => s.autoConvert);
	const displays = useRecorderStore((s) => s.displays);
	const windows = useRecorderStore((s) => s.windows);
	const displayId = useRecorderStore((s) => s.displayId);
	const windowId = useRecorderStore((s) => s.windowId);
	const region = useRecorderStore((s) => s.region);
	const pickingRegion = useRecorderStore((s) => s.pickingRegion);
	const countdownLeft = useRecorderStore((s) => s.countdownLeft);
	const elapsedSecs = useRecorderStore((s) => s.elapsedSecs);
	const error = useRecorderStore((s) => s.error);
	const refreshSources = useRecorderStore((s) => s.refreshSources);
	const setMode = useRecorderStore((s) => s.setMode);
	const setFps = useRecorderStore((s) => s.setFps);
	const setCountdown = useRecorderStore((s) => s.setCountdown);
	const setShowCursor = useRecorderStore((s) => s.setShowCursor);
	const setAutoConvert = useRecorderStore((s) => s.setAutoConvert);
	const setDisplayId = useRecorderStore((s) => s.setDisplayId);
	const setWindowId = useRecorderStore((s) => s.setWindowId);
	const pickRegion = useRecorderStore((s) => s.pickRegion);
	const cancelPickRegion = useRecorderStore((s) => s.cancelPickRegion);
	const confirmPickRegion = useRecorderStore((s) => s.confirmPickRegion);
	const begin = useRecorderStore((s) => s.begin);
	const stop = useRecorderStore((s) => s.stop);
	const captureScreenshot = useRecorderStore((s) => s.captureScreenshot);
	const reset = useRecorderStore((s) => s.reset);

	const format = useConverterStore((s) => s.format);
	const quality = useConverterStore((s) => s.quality);
	const setFormat = useConverterStore((s) => s.setFormat);
	const setQuality = useConverterStore((s) => s.setQuality);

	const busy =
		status === "countdown" || status === "recording" || status === "processing";
	const hideChrome =
		pickingRegion ||
		status === "countdown" ||
		status === "recording" ||
		status === "processing";

	useEffect(() => {
		void refreshSources();
	}, [refreshSources]);

	// Bloque scroll / rubber-band / gestures trackpad sur l’overlay.
	useEffect(() => {
		const block = (event: Event) => {
			event.preventDefault();
		};
		const opts: AddEventListenerOptions = { passive: false, capture: true };
		document.addEventListener("wheel", block, opts);
		document.addEventListener("gesturestart", block, opts);
		document.addEventListener("gesturechange", block, opts);
		document.addEventListener("gestureend", block, opts);
		document.addEventListener(
			"touchmove",
			block,
			opts,
		);
		return () => {
			document.removeEventListener("wheel", block, opts);
			document.removeEventListener("gesturestart", block, opts);
			document.removeEventListener("gesturechange", block, opts);
			document.removeEventListener("gestureend", block, opts);
			document.removeEventListener("touchmove", block, opts);
		};
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle("recorder-picking", pickingRegion);
		const hasRegion = Boolean(region) && mode === "region" && !pickingRegion;
		document.documentElement.classList.toggle("recorder-has-region", hasRegion);
		document.documentElement.classList.toggle(
			"recorder-recording",
			status === "recording" || status === "countdown",
		);
		return () => {
			document.documentElement.classList.remove("recorder-picking");
			document.documentElement.classList.remove("recorder-has-region");
			document.documentElement.classList.remove("recorder-recording");
		};
	}, [pickingRegion, region, mode, status]);

	const displayScale =
		displays.find((d) => d.id === displayId)?.scale ||
		window.devicePixelRatio ||
		2;

	const focusRect = useMemo<FocusRect | null>(() => {
		const display = displays.find((d) => d.id === displayId);
		if (mode === "region" && region) {
			return {
				x: region.x / displayScale,
				y: region.y / displayScale,
				width: region.width / displayScale,
				height: region.height / displayScale,
			};
		}
		if (mode === "window" && windowId != null && display) {
			const win = windows.find((w) => w.id === windowId);
			if (!win) return null;
			return {
				x: win.x - display.x,
				y: win.y - display.y,
				width: win.width,
				height: win.height,
			};
		}
		return null;
	}, [mode, region, displayScale, displays, displayId, windows, windowId]);

	const regionCss =
		region && mode === "region"
			? {
					x: region.x / displayScale,
					y: region.y / displayScale,
					width: region.width / displayScale,
					height: region.height / displayScale,
				}
			: null;

	const exitOverlay = () => {
		if (status === "countdown") reset();
		if (pickingRegion) cancelPickRegion();
		setView("welcome");
	};

	const onScreenshot = async () => {
		setShotBusy(true);
		try {
			await captureScreenshot();
		} finally {
			setShotBusy(false);
		}
	};

	return (
		<div className="recorder-stage relative h-dvh w-full overflow-hidden">
			{/* Cadre focus : idle + countdown (DimHole, sans box-shadow géant). */}
			{status !== "recording" &&
			status !== "processing" &&
			((status === "countdown" && focusRect) ||
				(regionCss && mode === "region" && !pickingRegion))
				? (() => {
						const rect =
							status === "countdown" && focusRect ? focusRect : regionCss!;
						const live = status === "countdown";
						return (
							<DimHole
								className="z-10"
								dimOpacity={live ? 0.5 : 0.28}
								rect={rect}
							/>
						);
					})()
				: null}

			{pickingRegion ? (
				<RegionDrawLayer
					onCancel={cancelPickRegion}
					onConfirm={confirmPickRegion}
				/>
			) : null}

			{status === "countdown" ? (
				<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/35">
					<div className="text-[7.5rem] font-semibold leading-none tracking-tight text-white drop-shadow-2xl [--number-flow-char-height:0.85em]">
						<AnimatedNumber value={countdownLeft} />
					</div>
				</div>
			) : null}

			{/* Barre stop minimale pendant l’enregistrement (hors zone focus si possible) */}
			{status === "recording" ? (
				<div className="absolute bottom-14 left-1/2 z-40 w-[min(420px,calc(100%-2rem))] -translate-x-1/2">
					<div className="app-no-drag flex items-center justify-between gap-3 rounded-[18px] border border-white/14 bg-[rgba(16,18,22,0.92)] px-4 py-3">
						<div className="flex items-center gap-3">
							<span className="size-2.5 rounded-full bg-danger" />
							<div>
								<p className="text-xs font-semibold tracking-wide text-white/90">
									{t("recorder.recording")}
								</p>
								<p className="font-mono text-[0.7rem] tabular-nums text-white/55">
									<AnimatedTime seconds={elapsedSecs} />
									<span> · </span>
									<AnimatedNumber value={fps} suffix=" fps" />
								</p>
							</div>
						</div>
						<Button size="sm" variant="danger" onPress={() => void stop()}>
							<Stop />
							{t("recorder.stop")}
						</Button>
					</div>
				</div>
			) : null}

			{status === "processing" ? (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
					<p className="text-sm font-semibold text-white">
						{t("recorder.processing")}
					</p>
				</div>
			) : null}

			{/* Widgets masqués pendant dessin / countdown / record */}
			{hideChrome ? (
				status === "countdown" ? (
					<div className="absolute bottom-14 left-1/2 z-40 -translate-x-1/2">
						<Button variant="secondary" onPress={() => reset()}>
							{t("recorder.cancel")}
						</Button>
					</div>
				) : null
			) : (
				<>
					{/* Top bar — un peu sous le bord (menu / notch / barre système) */}
					<div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 pt-11">
						<FloatingWidget
							className="flex items-center gap-2 px-2 py-2"
							delay={0.02}
						>
							<Button
								isIconOnly
								aria-label={t("recorder.exit")}
								size="sm"
								variant="ghost"
								onPress={exitOverlay}
							>
								<ArrowLeft />
							</Button>
							<div className="pr-3">
								<Typography
									className="text-sm font-semibold text-white"
									type="body-sm"
								>
									{t("recorder.title")}
								</Typography>
							</div>
						</FloatingWidget>

						<FloatingWidget
							className="flex items-center gap-2 px-2 py-2"
							delay={0.05}
						>
							<Button
								isIconOnly
								aria-label={t("recorder.outputSettings")}
								size="sm"
								variant={showOutput ? "primary" : "ghost"}
								onPress={() => setShowOutput((v) => !v)}
							>
								<Gear />
							</Button>
							<Button
								isIconOnly
								aria-label={t("recorder.exit")}
								size="sm"
								variant="ghost"
								onPress={exitOverlay}
							>
								<Xmark />
							</Button>
						</FloatingWidget>
					</div>

					{/* Source widget — left */}
					<FloatingWidget
						className="absolute left-6 top-32 z-20 w-70 space-y-4 p-4"
						delay={0.08}
					>
						<div>
							<Typography
								className="text-sm font-semibold text-white"
								type="body-sm"
							>
								{t("recorder.source")}
							</Typography>
							<Typography className="text-white/55" type="body-xs">
								{t("recorder.subtitle")}
							</Typography>
						</div>

						<div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/25 p-1">
							{(
								[
									["display", t("recorder.modeDisplay")],
									["window", t("recorder.modeWindow")],
									["region", t("recorder.modeRegion")],
								] as const
							).map(([value, label]) => (
								<button
									key={value}
									type="button"
									disabled={busy}
									className={[
										"rounded-xl px-2 py-2 text-[0.7rem] font-semibold ",
										mode === value
											? "bg-white/15 text-white"
											: "text-white/55 hover:bg-white/8 hover:text-white/80",
									].join(" ")}
									onClick={() => setMode(value as CaptureMode)}
								>
									{label}
								</button>
							))}
						</div>

						{mode === "display" ? (
							<Select
								className="w-full"
								isDisabled={busy || displays.length === 0}
								value={displayId != null ? String(displayId) : null}
								onChange={(key) => {
									if (key) setDisplayId(Number(key));
								}}
							>
								<Label className="text-white/70">{t("recorder.display")}</Label>
								<Select.Trigger>
									<Select.Value />
									<Select.Indicator />
								</Select.Trigger>
								<Select.Popover>
									<ListBox>
										{displays.map((display) => (
											<ListBox.Item
												id={String(display.id)}
												key={display.id}
												textValue={display.name}
											>
												{display.name}
												<ListBox.ItemIndicator />
											</ListBox.Item>
										))}
									</ListBox>
								</Select.Popover>
							</Select>
						) : null}

						{mode === "window" ? (
							<Select
								className="w-full"
								isDisabled={busy || windows.length === 0}
								value={windowId != null ? String(windowId) : null}
								onChange={(key) => {
									if (key) setWindowId(Number(key));
								}}
							>
								<Label className="text-white/70">{t("recorder.window")}</Label>
								<Select.Trigger>
									<Select.Value />
									<Select.Indicator />
								</Select.Trigger>
								<Select.Popover>
									<ListBox>
										{windows.map((windowItem) => (
											<ListBox.Item
												id={String(windowItem.id)}
												key={windowItem.id}
												textValue={windowItem.title}
											>
												{windowItem.title}
												<ListBox.ItemIndicator />
											</ListBox.Item>
										))}
									</ListBox>
								</Select.Popover>
							</Select>
						) : null}

						{mode === "region" ? (
							<div className="space-y-2">
								<Button
									fullWidth
									isDisabled={busy}
									variant="secondary"
									onPress={() => pickRegion()}
								>
									<SquareDashed />
									{t("recorder.drawRegion")}
								</Button>
								{region ? (
									<Chip color="accent" size="sm" variant="soft">
										{region.width}×{region.height}
									</Chip>
								) : (
									<Typography className="text-white/50" type="body-xs">
										{t("recorder.noRegion")}
									</Typography>
								)}
							</div>
						) : null}
					</FloatingWidget>

					{/* Capture settings — right */}
					<FloatingWidget
						className="absolute right-6 top-32 z-20 w-65 space-y-4 p-4"
						delay={0.12}
					>
						<Typography
							className="text-sm font-semibold text-white"
							type="body-sm"
						>
							{t("recorder.captureSettings")}
						</Typography>

						<div className="space-y-2">
							<Label className="text-white/70">{t("recorder.fps")}</Label>
							<div className="grid grid-cols-3 gap-1.5">
								{([30, 60, 120] as const).map((value) => (
									<button
										key={value}
										type="button"
										disabled={busy}
										className={[
											"rounded-xl px-2 py-2 text-xs font-semibold tabular-nums ",
											fps === value
												? "bg-accent/90 text-accent-foreground"
												: "bg-white/8 text-white/70 hover:bg-white/12",
										].join(" ")}
										onClick={() => setFps(value as FpsOption)}
									>
										<AnimatedNumber value={value} />
									</button>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-white/70">{t("recorder.countdown")}</Label>
							<div className="grid grid-cols-4 gap-1.5">
								{([0, 3, 5, 10] as const).map((value) => (
									<button
										key={value}
										type="button"
										disabled={busy}
										className={[
											"rounded-xl px-1.5 py-2 text-[0.7rem] font-semibold ",
											countdown === value
												? "bg-white/16 text-white"
												: "bg-white/8 text-white/65 hover:bg-white/12",
										].join(" ")}
										onClick={() => setCountdown(value as CountdownOption)}
									>
										{value === 0 ? t("recorder.countdownOff") : `${value}s`}
									</button>
								))}
							</div>
						</div>

						<div className="space-y-3 border-t border-white/8 pt-3">
							<Switch
								isDisabled={busy}
								isSelected={showCursor}
								onChange={setShowCursor}
							>
								<Switch.Content>
									<Switch.Control>
										<Switch.Thumb />
									</Switch.Control>
									<span className="text-sm text-white/85">
										{t("recorder.showCursor")}
									</span>
								</Switch.Content>
							</Switch>
							<Switch
								isDisabled={busy}
								isSelected={autoConvert}
								onChange={setAutoConvert}
							>
								<Switch.Content>
									<Switch.Control>
										<Switch.Thumb />
									</Switch.Control>
									<span className="text-sm text-white/85">
										{t("recorder.autoConvert")}
									</span>
								</Switch.Content>
								<Description className="text-white/45">
									{t("recorder.autoConvertHint")}
								</Description>
							</Switch>
						</div>
					</FloatingWidget>

					{showOutput ? (
						<FloatingWidget
							className="absolute bottom-32 right-6 z-20 w-70 space-y-4 p-4"
							delay={0}
						>
							<Typography
								className="text-sm font-semibold text-white"
								type="body-sm"
							>
								{t("recorder.outputSettings")}
							</Typography>
							<Select
								className="w-full"
								value={format}
								onChange={(key) => {
									if (key) void setFormat(String(key) as OutputFormat);
								}}
							>
								<Label className="text-white/70">{t("options.format")}</Label>
								<Select.Trigger>
									<Select.Value />
									<Select.Indicator />
								</Select.Trigger>
								<Select.Popover>
									<ListBox>
										{FORMAT_OPTIONS.map((option) => (
											<ListBox.Item
												id={option.id}
												key={option.id}
												textValue={option.id.toUpperCase()}
											>
												{option.id.toUpperCase()}
												<ListBox.ItemIndicator />
											</ListBox.Item>
										))}
									</ListBox>
								</Select.Popover>
							</Select>
							<div className="grid grid-cols-3 gap-1.5">
								{(["high", "balanced", "small"] as const).map((value) => (
									<button
										key={value}
										type="button"
										className={[
											"rounded-xl px-2 py-2 text-[0.7rem] font-semibold ",
											quality === value
												? "bg-white/16 text-white"
												: "bg-white/8 text-white/65 hover:bg-white/12",
										].join(" ")}
										onClick={() => setQuality(value as QualityPreset)}
									>
										{t(`qualities.${value}`)}
									</button>
								))}
							</div>
						</FloatingWidget>
					) : null}

					{/* Bottom control bar — un peu plus haute */}
					<div className="absolute bottom-14 left-1/2 z-20 w-[min(600px,calc(100%-2rem))] -translate-x-1/2">
						<FloatingWidget
							className="flex items-center justify-between gap-3 px-4 py-3.5"
							delay={0.16}
						>
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger/20 text-danger">
									<Display className="size-5" />
								</div>
								<div className="min-w-0">
									<Typography
										className="truncate text-sm font-semibold text-white"
										type="body-sm"
									>
										{mode === "display"
											? (displays.find((d) => d.id === displayId)?.name ??
												t("recorder.modeDisplay"))
											: mode === "window"
												? (windows.find((w) => w.id === windowId)?.title ??
													t("recorder.modeWindow"))
												: region
													? `${region.width}×${region.height}`
													: t("recorder.modeRegion")}
									</Typography>
									<Typography
										className="tabular-nums text-white/50"
										type="body-xs"
									>
										<AnimatedNumber value={fps} suffix=" fps" />
										{countdown > 0 ? ` · ${countdown}s` : ""}
										{autoConvert ? ` · ${format.toUpperCase()}` : ""}
									</Typography>
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-2">
								<Button
									isDisabled={busy}
									isPending={shotBusy}
									variant="secondary"
									onPress={() => void onScreenshot()}
								>
									<Camera />
									{t("recorder.screenshot")}
								</Button>
								<Button
									isDisabled={busy}
									variant="danger"
									onPress={() => void begin()}
								>
									<Video />
									{t("recorder.start")}
								</Button>
							</div>
						</FloatingWidget>

						{error ? (
							<p className="mt-3 text-center text-sm text-danger">{error}</p>
						) : (
							<p className="mt-3 text-center text-[0.7rem] text-white/40">
								{t("recorder.permissionHint")}
							</p>
						)}
					</div>
				</>
			)}
		</div>
	);
}
