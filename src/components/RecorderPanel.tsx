import { Display, SquareDashed, Stop, Video } from "@gravity-ui/icons";
import {
	Alert,
	Button,
	Chip,
	Description,
	Label,
	ListBox,
	Radio,
	RadioGroup,
	Select,
	Surface,
	Switch,
	Typography,
} from "@heroui/react";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { CaptureRegion } from "../lib/api";
import {
	useRecorderStore,
	type CaptureMode,
	type CountdownOption,
	type FpsOption,
} from "../store/recorder";

function formatElapsed(secs: number) {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RecorderPanel() {
	const { t } = useTranslation();
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
	const setRegion = useRecorderStore((s) => s.setRegion);
	const pickRegion = useRecorderStore((s) => s.pickRegion);
	const begin = useRecorderStore((s) => s.begin);
	const stop = useRecorderStore((s) => s.stop);

	const busy =
		status === "countdown" || status === "recording" || status === "processing";

	useEffect(() => {
		void refreshSources();
	}, [refreshSources]);

	useEffect(() => {
		let unlisten: (() => void) | undefined;
		void listen<{ region: CaptureRegion; displayId: number }>(
			"region-selected",
			(event) => {
				setRegion(event.payload.region);
				setDisplayId(event.payload.displayId);
				setMode("region");
			},
		).then((fn) => {
			unlisten = fn;
		});
		return () => unlisten?.();
	}, [setDisplayId, setMode, setRegion]);

	return (
		<div className="space-y-5">
			{status === "countdown" ? (
				<div className="flex min-h-55 items-center justify-center rounded-[28px] border border-border bg-surface/70">
					<Typography
						className="text-7xl font-semibold tabular-nums text-accent"
						type="h1"
					>
						{countdownLeft}
					</Typography>
				</div>
			) : null}

			{status === "recording" ? (
				<Surface className="flex items-center justify-between gap-4 rounded-[28px] border border-danger/30 bg-danger-soft/20 p-5">
					<div className="flex items-center gap-3">
						<span className="size-3 rounded-full bg-danger" />
						<div>
							<Typography className="font-semibold" type="body">
								{t("recorder.recording")}
							</Typography>
							<Typography color="muted" type="body-sm">
								{formatElapsed(elapsedSecs)} · {fps} fps
							</Typography>
						</div>
					</div>
					<Button variant="danger" onPress={() => void stop()}>
						<Stop />
						{t("recorder.stop")}
					</Button>
				</Surface>
			) : null}

			<Surface className="app-no-drag space-y-6 rounded-[28px] border border-border bg-surface/70 p-6">
				<div>
					<Typography className="font-semibold" type="h4">
						{t("recorder.title")}
					</Typography>
					<Typography color="muted" type="body-sm">
						{t("recorder.subtitle")}
					</Typography>
				</div>

				{error ? (
					<Alert status="danger">
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>{t("recorder.failed")}</Alert.Title>
							<Alert.Description>{error}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}

				<RadioGroup
					isDisabled={busy}
					name="capture-mode"
					orientation="horizontal"
					value={mode}
					variant="secondary"
					onChange={(value) => setMode(value as CaptureMode)}
				>
					<Label>{t("recorder.source")}</Label>
					<Radio value="display">
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							{t("recorder.modeDisplay")}
						</Radio.Content>
					</Radio>
					<Radio value="window">
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							{t("recorder.modeWindow")}
						</Radio.Content>
					</Radio>
					<Radio value="region">
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							{t("recorder.modeRegion")}
						</Radio.Content>
					</Radio>
				</RadioGroup>

				{mode === "display" ? (
					<Select
						className="w-full"
						isDisabled={busy || displays.length === 0}
						value={displayId != null ? String(displayId) : null}
						onChange={(key) => {
							if (key) setDisplayId(Number(key));
						}}
					>
						<Label>{t("recorder.display")}</Label>
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
						<Label>{t("recorder.window")}</Label>
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
					<div className="flex flex-wrap items-center gap-3">
						<Button
							isDisabled={busy}
							variant="secondary"
							onPress={() => pickRegion()}
						>
							<SquareDashed />
							{t("recorder.drawRegion")}
						</Button>
						{region ? (
							<Chip color="accent" variant="soft">
								{region.width}×{region.height}
							</Chip>
						) : (
							<Typography color="muted" type="body-sm">
								{t("recorder.noRegion")}
							</Typography>
						)}
					</div>
				) : null}

				<RadioGroup
					isDisabled={busy}
					name="fps"
					orientation="horizontal"
					value={String(fps)}
					variant="secondary"
					onChange={(value) => setFps(Number(value) as FpsOption)}
				>
					<Label>{t("recorder.fps")}</Label>
					<Description>{t("recorder.fpsHint")}</Description>
					{([30, 60, 120] as const).map((value) => (
						<Radio key={value} value={String(value)}>
							<Radio.Content>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
								{value} fps
							</Radio.Content>
						</Radio>
					))}
				</RadioGroup>

				<RadioGroup
					isDisabled={busy}
					name="countdown"
					orientation="horizontal"
					value={String(countdown)}
					variant="secondary"
					onChange={(value) => setCountdown(Number(value) as CountdownOption)}
				>
					<Label>{t("recorder.countdown")}</Label>
					{([0, 3, 5, 10] as const).map((value) => (
						<Radio key={value} value={String(value)}>
							<Radio.Content>
								<Radio.Control>
									<Radio.Indicator />
								</Radio.Control>
								{value === 0 ? t("recorder.countdownOff") : `${value}s`}
							</Radio.Content>
						</Radio>
					))}
				</RadioGroup>

				<div className="flex flex-col gap-3">
					<Switch
						isDisabled={busy}
						isSelected={showCursor}
						onChange={setShowCursor}
					>
						<Switch.Content>
							<Switch.Control>
								<Switch.Thumb />
							</Switch.Control>
							{t("recorder.showCursor")}
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
							{t("recorder.autoConvert")}
						</Switch.Content>
						<Description>{t("recorder.autoConvertHint")}</Description>
					</Switch>
				</div>

				{status !== "recording" && status !== "countdown" ? (
					<Button
						fullWidth
						isDisabled={busy}
						isPending={status === "processing"}
						size="lg"
						onPress={() => void begin()}
					>
						{status === "processing" ? (
							t("recorder.processing")
						) : (
							<>
								<Video />
								{t("recorder.start")}
							</>
						)}
					</Button>
				) : null}

				<div className="flex items-center gap-2 text-muted">
					<Display className="size-4" />
					<Typography color="muted" type="body-xs">
						{t("recorder.permissionHint")}
					</Typography>
				</div>
			</Surface>
		</div>
	);
}
