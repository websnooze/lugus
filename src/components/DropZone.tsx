import { ArrowUpFromLine, Filmstrip, Xmark } from "@gravity-ui/icons";
import { Button, Chip, Spinner, Surface, Typography } from "@heroui/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatBytes, formatDuration } from "../lib/format";
import { useConverterStore } from "../store/converter";

export function DropZone() {
	const { t } = useTranslation();
	const [dragging, setDragging] = useState(false);
	const video = useConverterStore((s) => s.video);
	const status = useConverterStore((s) => s.status);
	const chooseVideo = useConverterStore((s) => s.chooseVideo);
	const loadVideo = useConverterStore((s) => s.loadVideo);
	const reset = useConverterStore((s) => s.reset);
	const busy = status === "probing" || status === "converting";

	useEffect(() => {
		let unlisten: (() => void) | undefined;

		void getCurrentWindow()
			.onDragDropEvent((event) => {
				if (busy) return;

				if (event.payload.type === "enter" || event.payload.type === "over") {
					setDragging(true);
				} else if (event.payload.type === "leave") {
					setDragging(false);
				} else if (event.payload.type === "drop") {
					setDragging(false);
					const path = event.payload.paths[0];
					if (path) void loadVideo(path);
				}
			})
			.then((fn) => {
				unlisten = fn;
			})
			.catch(() => undefined);

		return () => unlisten?.();
	}, [busy, loadVideo]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
		>
			<Surface
				className={[
					"app-no-drag relative overflow-hidden rounded-[28px] border border-dashed p-1 transition-colors",
					dragging
						? "border-accent bg-accent-soft/40"
						: "border-border bg-surface/40",
				].join(" ")}
				variant="secondary"
			>
				<div className="flex min-h-55 flex-col items-center justify-center gap-4 rounded-[24px] px-6 py-10 text-center">
					{status === "probing" ? (
						<>
							<Spinner color="current" size="lg" />
							<Typography color="muted" type="body-sm">
								{t("dropzone.analyzing")}
							</Typography>
						</>
					) : video ? (
						<>
							<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
								<Filmstrip width={28} height={28} />
							</div>
							<div className="space-y-2">
								<Typography
									className="max-w-md truncate font-semibold"
									type="h4"
								>
									{video.name}
								</Typography>
								<div className="flex flex-wrap items-center justify-center gap-2">
									<Chip color="accent" size="sm" variant="soft">
										{video.width}×{video.height}
									</Chip>
									<Chip size="sm" variant="soft">
										{formatDuration(video.duration)}
									</Chip>
									<Chip size="sm" variant="soft">
										{formatBytes(video.sizeBytes)}
									</Chip>
									{video.videoCodec ? (
										<Chip size="sm" variant="soft">
											{video.videoCodec}
										</Chip>
									) : null}
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									isDisabled={busy}
									variant="secondary"
									onPress={() => void chooseVideo()}
								>
									{t("dropzone.change")}
								</Button>
								<Button
									isDisabled={busy}
									isIconOnly
									aria-label={t("dropzone.remove")}
									variant="ghost"
									onPress={() => reset()}
								>
									<Xmark />
								</Button>
							</div>
						</>
					) : (
						<>
							<motion.div
								animate={{ y: dragging ? -4 : [0, -3, 0] }}
								transition={{
									duration: dragging ? 0.2 : 2.4,
									repeat: dragging ? 0 : Infinity,
									ease: "easeInOut",
								}}
								className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
							>
								<ArrowUpFromLine width={28} height={28} />
							</motion.div>
							<div className="space-y-1">
								<Typography className="font-semibold" type="h4">
									{t("dropzone.title")}
								</Typography>
								<Typography color="muted" type="body-sm">
									{t("dropzone.subtitle")}
								</Typography>
							</div>
							<Button size="lg" onPress={() => void chooseVideo()}>
								{t("dropzone.choose")}
							</Button>
						</>
					)}
				</div>
			</Surface>
		</motion.div>
	);
}
