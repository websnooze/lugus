use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    // Place Credits.rtf à côté du binaire pour que le panneau About
    // natif fonctionne aussi avec `tauri dev` (pas seulement le .app bundlé).
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".into());
    let credits_src = manifest_dir.join("Credits.rtf");
    if credits_src.exists() {
        let target_dir = manifest_dir
            .join("..")
            .join("target")
            .join(&profile);
        if let Err(error) = fs::create_dir_all(&target_dir) {
            println!("cargo:warning=Credits.rtf: {error}");
        } else {
            let dest = target_dir.join("Credits.rtf");
            if let Err(error) = fs::copy(&credits_src, &dest) {
                println!("cargo:warning=Credits.rtf copy failed: {error}");
            }
        }
        println!("cargo:rerun-if-changed=Credits.rtf");
    }

    tauri_build::build()
}
