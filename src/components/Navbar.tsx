import { Bars, Gear } from "@gravity-ui/icons";
import {
	Button,
	Description,
	Dropdown,
	Label,
	Typography,
} from "@heroui/react";
import { useTranslation } from "react-i18next";

import { usePreferencesStore } from "../store/preferences";

export function Navbar() {
	const { t } = useTranslation();
	const view = usePreferencesStore((s) => s.view);
	const setView = usePreferencesStore((s) => s.setView);

	return (
		<header className="app-drag sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-8 pb-3 pt-5 backdrop-blur-md">
			<div className="app-no-drag flex items-center gap-3">
				<Typography
					className=" text-[1.35rem] leading-none tracking-tight"
					type="h3"
				>
					{view === "settings" ? t("settings.title") : t("app.title")}
				</Typography>
			</div>

			<div className="app-no-drag flex items-center gap-2">
				<Dropdown>
					<Button isIconOnly aria-label={t("nav.menu")} variant="secondary">
						<Bars />
					</Button>
					<Dropdown.Popover className="min-w-55">
						<Dropdown.Menu
							onAction={(key) => {
								if (key === "settings") setView("settings");
								if (key === "home") setView("home");
							}}
						>
							<Dropdown.Item id="home" textValue={t("nav.home")}>
								<div className="flex h-8 items-start justify-center pt-px">
									<span className="text-sm font-semibold text-muted">VC</span>
								</div>
								<div className="flex flex-col">
									<Label>{t("nav.home")}</Label>
								</div>
							</Dropdown.Item>
							<Dropdown.Item id="settings" textValue={t("nav.settings")}>
								<div className="flex h-8 items-start justify-center pt-px">
									<Gear className="size-4 shrink-0 text-muted" />
								</div>
								<div className="flex flex-col">
									<Label>{t("nav.settings")}</Label>
									<Description>{t("nav.settingsDesc")}</Description>
								</div>
							</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown.Popover>
				</Dropdown>
			</div>
		</header>
	);
}
