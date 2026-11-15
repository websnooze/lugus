//! Overlay macOS : bord-à-bord sans Space fullscreen, au-dessus des apps plein écran.
//! Les appels AppKit passent forcément sur le main thread.

use std::sync::mpsc;

use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

#[cfg(target_os = "macos")]
use objc2::MainThreadMarker;
#[cfg(target_os = "macos")]
use objc2_app_kit::{
    NSPopUpMenuWindowLevel, NSWindow, NSWindowCollectionBehavior, NSWindowLevel,
};

#[derive(Clone, Copy)]
pub enum OverlayRole {
    /// Widgets recorder / HUD — au-dessus des apps, tous les Spaces.
    Recorder,
    /// Réservé (niveau encore plus haut si besoin).
    Picker,
}

#[cfg(target_os = "macos")]
fn collection_behavior_for_overlay() -> NSWindowCollectionBehavior {
    // CanJoinAllSpaces et MoveToActiveSpace sont incompatibles
    // (_validateCollectionBehavior: abort). Pas de Stationary/Transient.
    NSWindowCollectionBehavior::CanJoinAllSpaces
        | NSWindowCollectionBehavior::FullScreenAuxiliary
        | NSWindowCollectionBehavior::IgnoresCycle
}

#[cfg(target_os = "macos")]
fn level_for(role: OverlayRole) -> NSWindowLevel {
    // Status (25) passe sous beaucoup d’apps ; PopUpMenu (101) reste au-dessus.
    match role {
        OverlayRole::Recorder | OverlayRole::Picker => NSPopUpMenuWindowLevel,
    }
}

#[cfg(target_os = "macos")]
fn apply_now<R: Runtime>(
    window: &WebviewWindow<R>,
    enabled: bool,
    role: OverlayRole,
) -> Result<(), String> {
    let ptr = window
        .ns_window()
        .map_err(|e| format!("ns_window unavailable: {e}"))?;
    if ptr.is_null() {
        return Err("ns_window is null".into());
    }

    // Safety: pointer comes from Tauri's live NSWindow for this WebviewWindow.
    let ns_window = unsafe { &*(ptr as *const NSWindow) };

    if enabled {
        ns_window.setLevel(level_for(role));
        ns_window.setCollectionBehavior(collection_behavior_for_overlay());
        ns_window.setHidesOnDeactivate(false);
        ns_window.setHasShadow(false);
        ns_window.orderFrontRegardless();
    } else {
        ns_window.setLevel(0 as NSWindowLevel);
        ns_window.setCollectionBehavior(NSWindowCollectionBehavior::Default);
        ns_window.setHidesOnDeactivate(true);
    }

    Ok(())
}

fn run_on_appkit_main<R: Runtime, F>(window: &WebviewWindow<R>, work: F) -> Result<(), String>
where
    F: FnOnce(&WebviewWindow<R>) -> Result<(), String> + Send + 'static,
{
    #[cfg(target_os = "macos")]
    {
        if MainThreadMarker::new().is_some() {
            return work(window);
        }

        let window = window.clone();
        let window_for_main = window.clone();
        let (tx, rx) = mpsc::channel();

        window
            .run_on_main_thread(move || {
                let _ = tx.send(work(&window_for_main));
            })
            .map_err(|e| format!("run_on_main_thread failed: {e}"))?;

        return rx
            .recv()
            .map_err(|_| "main thread channel closed".to_string())?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, work);
        Ok(())
    }
}

/// Active ou désactive le mode overlay « au-dessus de tout / tous les Spaces ».
pub fn apply_overlay_chrome<R: Runtime>(
    window: &WebviewWindow<R>,
    enabled: bool,
) -> Result<(), String> {
    apply_overlay_chrome_with_role(window, enabled, OverlayRole::Recorder)
}

pub fn apply_overlay_chrome_with_role<R: Runtime>(
    window: &WebviewWindow<R>,
    enabled: bool,
    role: OverlayRole,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let enabled = enabled;
        let role = role;
        return run_on_appkit_main(window, move |win| apply_now(win, enabled, role));
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, enabled, role);
        Ok(())
    }
}

#[tauri::command]
pub fn set_macos_overlay_mode<R: Runtime>(
    app: AppHandle<R>,
    label: String,
    enabled: bool,
) -> Result<(), String> {
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("window `{label}` not found"))?;
    apply_overlay_chrome(&window, enabled)
}
