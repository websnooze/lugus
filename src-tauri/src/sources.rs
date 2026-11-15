use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SourcesError {
    #[error("{0}")]
    Message(String),
}

impl Serialize for SourcesError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale: f64,
    pub is_main: bool,
    pub ffmpeg_index: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub owner: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
}

#[cfg(target_os = "macos")]
mod macos {
    use super::{DisplayInfo, SourcesError, WindowInfo};
    use core_foundation::array::{CFArray, CFArrayRef};
    use core_foundation::base::{TCFType, ToVoid};
    use core_foundation::dictionary::CFDictionary;
    use core_foundation::number::CFNumber;
    use core_foundation::string::CFString;
    use core_graphics::display::{
        kCGWindowListExcludeDesktopElements, kCGWindowListOptionOnScreenOnly, CGDisplay,
        CGWindowListCopyWindowInfo,
    };
    use std::ffi::c_void;

    fn dict_number(dict: &CFDictionary, key: &str) -> Option<i64> {
        let cf_key = CFString::new(key);
        let value = dict.find(cf_key.to_void())?;
        unsafe {
            let number = CFNumber::wrap_under_get_rule(*value as *const _);
            number.to_i64()
        }
    }

    fn dict_string(dict: &CFDictionary, key: &str) -> Option<String> {
        let cf_key = CFString::new(key);
        let value = dict.find(cf_key.to_void())?;
        unsafe {
            let string = CFString::wrap_under_get_rule(*value as *const _);
            Some(string.to_string())
        }
    }

    pub fn list_displays() -> Result<Vec<DisplayInfo>, SourcesError> {
        let ids = CGDisplay::active_displays().map_err(|e| {
            SourcesError::Message(format!("Impossible de lister les écrans : {e:?}"))
        })?;

        let main_id = CGDisplay::main().id;
        let mut displays = Vec::new();

        for (index, id) in ids.into_iter().enumerate() {
            let display = CGDisplay::new(id);
            let bounds = display.bounds();
            let point_w = bounds.size.width.round().max(1.0) as u32;
            let point_h = bounds.size.height.round().max(1.0) as u32;
            let pixel_width = (display.pixels_wide() as u32).max(point_w);
            let pixel_height = (display.pixels_high() as u32).max(point_h);
            let scale = pixel_width as f64 / point_w as f64;

            displays.push(DisplayInfo {
                id,
                name: if id == main_id {
                    format!("Écran principal ({pixel_width}×{pixel_height})")
                } else {
                    format!("Écran {} ({pixel_width}×{pixel_height})", index + 1)
                },
                width: pixel_width,
                height: pixel_height,
                x: bounds.origin.x.round() as i32,
                y: bounds.origin.y.round() as i32,
                scale,
                is_main: id == main_id,
                ffmpeg_index: index as u32,
            });
        }

        displays.sort_by_key(|d| (!d.is_main, d.id));
        Ok(displays)
    }

    pub fn list_windows() -> Result<Vec<WindowInfo>, SourcesError> {
        let options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements;
        let info_ref: CFArrayRef = unsafe { CGWindowListCopyWindowInfo(options, 0) };
        if info_ref.is_null() {
            return Err(SourcesError::Message(
                "Impossible de lister les fenêtres".into(),
            ));
        }

        let array: CFArray<*const c_void> =
            unsafe { CFArray::wrap_under_create_rule(info_ref) };

        let mut windows = Vec::new();
        for item in array.iter() {
            let dict: CFDictionary = unsafe { CFDictionary::wrap_under_get_rule(*item as *const _) };
            let layer = dict_number(&dict, "kCGWindowLayer").unwrap_or(0);
            if layer != 0 {
                continue;
            }

            let id = dict_number(&dict, "kCGWindowNumber").unwrap_or(0) as u32;
            let owner = dict_string(&dict, "kCGWindowOwnerName").unwrap_or_default();
            let title = dict_string(&dict, "kCGWindowName").unwrap_or_default();
            if owner.is_empty() || owner == "Video Converter" || owner == "Window Server" {
                continue;
            }

            let bounds_key = CFString::new("kCGWindowBounds");
            let Some(bounds_ref) = dict.find(bounds_key.to_void()) else {
                continue;
            };
            let bounds_dict: CFDictionary =
                unsafe { CFDictionary::wrap_under_get_rule(*bounds_ref as *const _) };

            let x = dict_number(&bounds_dict, "X").unwrap_or(0) as i32;
            let y = dict_number(&bounds_dict, "Y").unwrap_or(0) as i32;
            let width = dict_number(&bounds_dict, "Width").unwrap_or(0).max(1) as u32;
            let height = dict_number(&bounds_dict, "Height").unwrap_or(0).max(1) as u32;

            if width < 80 || height < 80 {
                continue;
            }

            let label = if title.is_empty() {
                owner.clone()
            } else {
                format!("{owner} — {title}")
            };

            windows.push(WindowInfo {
                id,
                title: label,
                owner,
                width,
                height,
                x,
                y,
            });
        }

        windows.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
        Ok(windows)
    }
}

#[cfg(not(target_os = "macos"))]
mod macos {
    use super::{DisplayInfo, SourcesError, WindowInfo};

    pub fn list_displays() -> Result<Vec<DisplayInfo>, SourcesError> {
        Err(SourcesError::Message(
            "L’enregistrement d’écran n’est disponible que sur macOS".into(),
        ))
    }

    pub fn list_windows() -> Result<Vec<WindowInfo>, SourcesError> {
        Err(SourcesError::Message(
            "L’enregistrement d’écran n’est disponible que sur macOS".into(),
        ))
    }
}

#[tauri::command]
pub fn list_displays() -> Result<Vec<DisplayInfo>, SourcesError> {
    macos::list_displays()
}

#[tauri::command]
pub fn list_windows() -> Result<Vec<WindowInfo>, SourcesError> {
    macos::list_windows()
}
