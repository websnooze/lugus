//! Overlay recorder via NSPanel (tauri-nspanel) pour rester au-dessus
//! des apps fullscreen et suivre les Spaces / slides.

use tauri::AppHandle;

#[cfg(target_os = "macos")]
mod macos {
    use std::sync::atomic::{AtomicBool, Ordering};

    use tauri::{AppHandle, Manager};
    use tauri_nspanel::{
        tauri_panel, CollectionBehavior, ManagerExt, PanelLevel, StyleMask, WebviewWindowExt,
    };

    tauri_panel! {
        panel!(RecorderPanel {
            config: {
                // Ne jamais devenir key : un contact trackpad activerait l’app
                // et ferait quitter le contexte fullscreen / Spaces.
                can_become_key_window: false,
                can_become_main_window: false,
                is_floating_panel: true
            }
        })
    }

    static PANEL_ACTIVE: AtomicBool = AtomicBool::new(false);

    pub fn set_mode(app: &AppHandle, enabled: bool) -> Result<(), String> {
        if enabled {
            enable(app)
        } else {
            disable(app)
        }
    }

    fn enable(app: &AppHandle) -> Result<(), String> {
        let already = PANEL_ACTIVE.load(Ordering::SeqCst);

        let panel = match app.get_webview_panel("main") {
            Ok(panel) => panel,
            Err(_) => {
                let window = app
                    .get_webview_window("main")
                    .ok_or_else(|| "Fenêtre main introuvable".to_string())?;
                window
                    .to_panel::<RecorderPanel>()
                    .map_err(|e| format!("to_panel failed: {e}"))?
            }
        };

        // Reste Accessory (app agent / pas de Dock) pendant l’overlay.
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);

        panel.set_level(PanelLevel::PopUpMenu.value());
        panel
            .add_style_mask(StyleMask::empty().nonactivating_panel().into())
            .map_err(|e| format!("nonactivating_panel failed: {e}"))?;
        panel.set_collection_behavior(
            CollectionBehavior::new()
                .full_screen_auxiliary()
                .can_join_all_spaces()
                .ignores_cycle()
                .into(),
        );
        panel.set_hides_on_deactivate(false);
        panel.set_floating_panel(true);
        panel.set_works_when_modal(true);

        if !already {
            panel.show();
            panel.order_front_regardless();
        }

        PANEL_ACTIVE.store(true, Ordering::SeqCst);
        Ok(())
    }

    fn disable(app: &AppHandle) -> Result<(), String> {
        PANEL_ACTIVE.store(false, Ordering::SeqCst);
        // Ne pas repasser en Regular : ça ferait réapparaître l’icône Dock.
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);

        let Ok(panel) = app.get_webview_panel("main") else {
            return Ok(());
        };

        panel.set_level(PanelLevel::Normal.value());
        panel.set_hides_on_deactivate(true);
        panel.set_floating_panel(false);
        let _ = panel.to_window();
        Ok(())
    }
}

/// Active / désactive le mode NSPanel fullscreen-aware sur `main`.
#[tauri::command]
pub fn set_recorder_panel_mode(app: AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return macos::set_mode(&app, enabled);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, enabled);
        Ok(())
    }
}
