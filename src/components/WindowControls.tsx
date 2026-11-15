import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";

/** Feux de circulation macOS custom (fermer / réduire / agrandir). */
export function WindowControls() {
	const { t } = useTranslation();

	const close = () => {
		void getCurrentWindow().close();
	};

	const minimize = () => {
		void getCurrentWindow().minimize();
	};

	const toggleMaximize = () => {
		void getCurrentWindow().toggleMaximize();
	};

	return (
		<div className="app-no-drag flex items-center gap-1.75 pl-0.5">
			<button
				type="button"
				aria-label={t("nav.windowClose")}
				className="group flex size-3 items-center justify-center rounded-full bg-[#ff5f57] hover:brightness-95"
				onClick={close}
			>
				<span className="pointer-events-none text-[8px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">
					×
				</span>
			</button>
			<button
				type="button"
				aria-label={t("nav.windowMinimize")}
				className="group flex size-3 items-center justify-center rounded-full bg-[#febc2e] hover:brightness-95"
				onClick={minimize}
			>
				<span className="pointer-events-none text-[9px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">
					−
				</span>
			</button>
			<button
				type="button"
				aria-label={t("nav.windowMaximize")}
				className="group flex size-3 items-center justify-center rounded-full bg-[#28c840] hover:brightness-95"
				onClick={toggleMaximize}
			>
				<span className="pointer-events-none text-[7px] font-bold leading-none text-black/55 opacity-0 group-hover:opacity-100">
					+
				</span>
			</button>
		</div>
	);
}
