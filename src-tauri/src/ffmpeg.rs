use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FfmpegError {
    #[error("FFmpeg introuvable. Installez-le avec Homebrew : brew install ffmpeg")]
    NotFound,
    #[error("FFprobe a échoué : {0}")]
    ProbeFailed(String),
    #[error("Conversion annulée")]
    Cancelled,
    #[error("Conversion échouée : {0}")]
    ConversionFailed(String),
    #[error("Fichier introuvable : {0}")]
    FileNotFound(String),
    #[error("Format non supporté : {0}")]
    UnsupportedFormat(String),
    #[error("IO : {0}")]
    Io(#[from] std::io::Error),
}

impl Serialize for FfmpegError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub path: String,
    pub name: String,
    /// `"video"` ou `"image"`.
    pub kind: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub size_bytes: u64,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

/// Formats image exclusifs (hors GIF, aussi utilisé en export vidéo animé).
pub fn is_exclusive_image_format(format: &str) -> bool {
    matches!(
        format,
        "jpg" | "jpeg" | "png" | "webp" | "heic" | "heif" | "avif" | "tiff" | "bmp" | "jxl" | "jp2"
    )
}

pub fn uses_sips_encode(format: &str) -> bool {
    matches!(format, "heic" | "heif" | "jp2")
}

pub fn should_convert_as_image(media_kind: &str, format: &str) -> bool {
    is_exclusive_image_format(format) || (media_kind == "image" && format == "gif")
}

fn extension_of(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
}

fn looks_like_image_path(path: &str) -> bool {
    matches!(
        extension_of(path).as_str(),
        "jpg" | "jpeg" | "png" | "webp" | "heic" | "heif" | "avif" | "tif" | "tiff" | "bmp"
            | "jxl" | "jp2" | "psd" | "tga" | "ico" | "gif"
    )
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub percent: f64,
    pub time_secs: f64,
    pub speed: Option<String>,
}

pub fn find_binary(name: &str) -> Result<PathBuf, FfmpegError> {
    let candidates = [
        format!("/opt/homebrew/bin/{name}"),
        format!("/usr/local/bin/{name}"),
        format!("/usr/bin/{name}"),
    ];

    for path in candidates {
        let p = PathBuf::from(&path);
        if p.exists() {
            return Ok(p);
        }
    }

    let output = Command::new("which").arg(name).output();
    if let Ok(output) = output {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(PathBuf::from(path));
            }
        }
    }

    Err(FfmpegError::NotFound)
}

pub fn check_ffmpeg() -> Result<String, FfmpegError> {
    let ffmpeg = find_binary("ffmpeg")?;
    let output = Command::new(&ffmpeg)
        .arg("-version")
        .output()
        .map_err(|_| FfmpegError::NotFound)?;

    if !output.status.success() {
        return Err(FfmpegError::NotFound);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout
        .lines()
        .next()
        .unwrap_or("ffmpeg")
        .trim()
        .to_string();

    Ok(version)
}

pub fn probe_video(path: &str) -> Result<VideoInfo, FfmpegError> {
    let input = Path::new(path);
    if !input.exists() {
        return Err(FfmpegError::FileNotFound(path.to_string()));
    }

    let ffprobe = find_binary("ffprobe")?;
    let output = Command::new(ffprobe)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(FfmpegError::ProbeFailed(stderr.trim().to_string()));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| FfmpegError::ProbeFailed(e.to_string()))?;

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let size_bytes = json["format"]["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .or_else(|| std::fs::metadata(path).ok().map(|m| m.len()))
        .unwrap_or(0);

    let streams = json["streams"].as_array().cloned().unwrap_or_default();
    let video_stream = streams.iter().find(|s| s["codec_type"] == "video");
    let audio_stream = streams.iter().find(|s| s["codec_type"] == "audio");

    let width = video_stream
        .and_then(|s| s["width"].as_u64())
        .unwrap_or(0) as u32;
    let height = video_stream
        .and_then(|s| s["height"].as_u64())
        .unwrap_or(0) as u32;

    let video_codec = video_stream
        .and_then(|s| s["codec_name"].as_str())
        .map(str::to_string);
    let audio_codec = audio_stream
        .and_then(|s| s["codec_name"].as_str())
        .map(str::to_string);

    let nb_frames = video_stream
        .and_then(|s| s["nb_frames"].as_str())
        .and_then(|s| s.parse::<u64>().ok())
        .or_else(|| video_stream.and_then(|s| s["nb_frames"].as_u64()));

    let format_name = json["format"]["format_name"]
        .as_str()
        .unwrap_or("")
        .to_ascii_lowercase();
    let major_brand = json["format"]["tags"]["major_brand"]
        .as_str()
        .unwrap_or("")
        .to_ascii_lowercase();

    let image_codec = matches!(
        video_codec.as_deref(),
        Some("mjpeg" | "png" | "webp" | "bmp" | "tiff" | "gif" | "jpeg2000" | "jpegxl" | "pam"
            | "ppm" | "pgm" | "rawvideo")
    );
    let heif_brand = matches!(
        major_brand.as_str(),
        "heic" | "heix" | "hevc" | "mif1" | "msf1" | "miaf" | "avif"
    );
    let ext = extension_of(path);
    let ext_is_image = looks_like_image_path(path);
    let still_by_frames = audio_stream.is_none()
        && duration <= 0.15
        && nb_frames.map(|n| n <= 1).unwrap_or(ext_is_image);

    let kind = if ext == "gif" && duration > 0.4 {
        "video"
    } else if ext_is_image
        || image_codec
        || heif_brand
        || format_name.contains("image2")
        || format_name.contains("pipe")
        || (still_by_frames && video_stream.is_some() && audio_stream.is_none())
    {
        "image"
    } else {
        "video"
    };

    let name = input
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(if kind == "image" { "image" } else { "video" })
        .to_string();

    Ok(VideoInfo {
        path: path.to_string(),
        name,
        kind: kind.into(),
        duration,
        width,
        height,
        size_bytes,
        video_codec,
        audio_codec,
    })
}

fn vt_bitrate(quality: &str, high: &str, balanced: &str, small: &str) -> String {
    match quality {
        "high" => high.into(),
        "small" => small.into(),
        _ => balanced.into(),
    }
}

fn push_videotoolbox_encoder(
    args: &mut Vec<String>,
    codec: &str,
    bitrate: String,
    extra: &[(&str, &str)],
) {
    args.extend([
        "-c:v".into(),
        codec.into(),
        "-b:v".into(),
        bitrate,
        "-allow_sw".into(),
        "1".into(),
        "-realtime".into(),
        "0".into(),
        "-prio_speed".into(),
        "true".into(),
        "-threads".into(),
        "0".into(),
        "-c:a".into(),
        "aac".into(),
        "-b:a".into(),
        "160k".into(),
    ]);

    for (key, value) in extra {
        args.push((*key).into());
        args.push((*value).into());
    }
}

pub fn build_ffmpeg_args_for(
    input: &str,
    output: &str,
    format: &str,
    quality: &str,
    media_kind: &str,
) -> Result<Vec<String>, FfmpegError> {
    if should_convert_as_image(media_kind, format) {
        return build_image_ffmpeg_args(input, output, format, quality);
    }

    // Décodage GPU VideoToolbox avant -i, puis encode accéléré.
    let mut args = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-hwaccel".into(),
        "videotoolbox".into(),
        "-i".into(),
        input.into(),
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
    ];

    let crf = match quality {
        "high" => "20",
        "small" => "32",
        _ => "26",
    };

    // VP9: cpu-used plus élevé = beaucoup plus rapide
    let vp9_cpu = match quality {
        "high" => "4",
        "small" => "8",
        _ => "6",
    };

    match format {
        "mp4" => {
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[("-movflags", "+faststart")],
            );
        }
        "hevc" => {
            push_videotoolbox_encoder(
                &mut args,
                "hevc_videotoolbox",
                vt_bitrate(quality, "6M", "3M", "1.5M"),
                &[("-tag:v", "hvc1"), ("-movflags", "+faststart")],
            );
        }
        "mov" => {
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[],
            );
        }
        "mkv" => {
            // Même encodeur hardware que MP4 — nettement plus rapide que libx264
            push_videotoolbox_encoder(
                &mut args,
                "h264_videotoolbox",
                vt_bitrate(quality, "8M", "4M", "2M"),
                &[],
            );
        }
        "webm" => {
            args.extend([
                "-c:v".into(),
                "libvpx-vp9".into(),
                "-crf".into(),
                crf.into(),
                "-b:v".into(),
                "0".into(),
                "-row-mt".into(),
                "1".into(),
                "-threads".into(),
                "0".into(),
                "-deadline".into(),
                "good".into(),
                "-cpu-used".into(),
                vp9_cpu.into(),
                "-c:a".into(),
                "libopus".into(),
                "-b:a".into(),
                "128k".into(),
            ]);
        }
        "gif" => {
            let scale = match quality {
                "high" => "640",
                "small" => "240",
                _ => "400",
            };
            let fps = match quality {
                "high" => "12",
                "small" => "8",
                _ => "10",
            };
            // Filtre unique (évite le double-pass palettegen coûteux)
            args.extend([
                "-vf".into(),
                format!("fps={fps},scale={scale}:-1:flags=fast_bilinear"),
                "-an".into(),
                "-threads".into(),
                "0".into(),
            ]);
        }
        "mp3" => {
            // Pas besoin de décodage vidéo GPU
            args = vec![
                "-y".into(),
                "-hide_banner".into(),
                "-i".into(),
                input.into(),
                "-progress".into(),
                "pipe:1".into(),
                "-nostats".into(),
                "-vn".into(),
                "-c:a".into(),
                "libmp3lame".into(),
                "-q:a".into(),
                match quality {
                    "high" => "0",
                    "small" => "5",
                    _ => "2",
                }
                .into(),
                "-threads".into(),
                "0".into(),
            ];
        }
        other => return Err(FfmpegError::UnsupportedFormat(other.to_string())),
    }

    args.push(output.into());
    Ok(args)
}

fn build_image_ffmpeg_args(
    input: &str,
    output: &str,
    format: &str,
    quality: &str,
) -> Result<Vec<String>, FfmpegError> {
    // HEIC / JP2 : encodés via sips (ImageIO), pas FFmpeg.
    if uses_sips_encode(format) {
        return Err(FfmpegError::UnsupportedFormat(format.to_string()));
    }

    let mut args = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-i".into(),
        input.into(),
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
        "-frames:v".into(),
        "1".into(),
        "-an".into(),
    ];

    match format {
        "jpg" | "jpeg" => {
            let q = match quality {
                "high" => "2",
                "small" => "8",
                _ => "5",
            };
            args.extend([
                "-c:v".into(),
                "mjpeg".into(),
                "-q:v".into(),
                q.into(),
                "-pix_fmt".into(),
                "yuvj420p".into(),
            ]);
        }
        "png" => {
            let level = match quality {
                "high" => "1",
                "small" => "9",
                _ => "6",
            };
            args.extend([
                "-c:v".into(),
                "png".into(),
                "-compression_level".into(),
                level.into(),
            ]);
        }
        "webp" => {
            let q = match quality {
                "high" => "95",
                "small" => "70",
                _ => "85",
            };
            args.extend([
                "-c:v".into(),
                "libwebp".into(),
                "-quality".into(),
                q.into(),
                "-compression_level".into(),
                "6".into(),
            ]);
        }
        "avif" => {
            let crf = match quality {
                "high" => "24",
                "small" => "40",
                _ => "32",
            };
            args.extend([
                "-c:v".into(),
                "libaom-av1".into(),
                "-still-picture".into(),
                "1".into(),
                "-crf".into(),
                crf.into(),
                "-cpu-used".into(),
                "6".into(),
                "-pix_fmt".into(),
                "yuv420p".into(),
            ]);
        }
        "tiff" => {
            args.extend(["-c:v".into(), "tiff".into()]);
        }
        "bmp" => {
            args.extend(["-c:v".into(), "bmp".into()]);
        }
        "gif" => {
            args.extend([
                "-vf".into(),
                "scale=trunc(iw/2)*2:trunc(ih/2)*2".into(),
                "-c:v".into(),
                "gif".into(),
            ]);
        }
        "jxl" => {
            let q = match quality {
                "high" => "95",
                "small" => "70",
                _ => "85",
            };
            args.extend([
                "-c:v".into(),
                "libjxl".into(),
                "-q:v".into(),
                q.into(),
                "-update".into(),
                "1".into(),
            ]);
        }
        other => return Err(FfmpegError::UnsupportedFormat(other.to_string())),
    }

    args.push(output.into());
    Ok(args)
}

/// Encode HEIC / HEIF / JP2 via `sips` (ImageIO macOS).
pub fn convert_image_with_sips(
    input: &str,
    output: &str,
    format: &str,
    quality: &str,
) -> Result<(), FfmpegError> {
    let sips_format = match format {
        "heic" | "heif" => "heic",
        "jp2" => "jp2",
        "jpg" | "jpeg" => "jpeg",
        "png" => "png",
        "tiff" => "tiff",
        "bmp" => "bmp",
        "gif" => "gif",
        other => return Err(FfmpegError::UnsupportedFormat(other.to_string())),
    };

    let format_options = match quality {
        "high" => "best",
        "small" => "low",
        _ => "normal",
    };

    let output_path = Path::new(output);
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let result = Command::new("/usr/bin/sips")
        .args([
            "-s",
            "format",
            sips_format,
            "-s",
            "formatOptions",
            format_options,
            input,
            "--out",
            output,
        ])
        .output()?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        let stdout = String::from_utf8_lossy(&result.stdout);
        return Err(FfmpegError::ConversionFailed(
            format!("{stderr}{stdout}").trim().to_string(),
        ));
    }

    if !output_path.exists() {
        return Err(FfmpegError::ConversionFailed(
            "sips n’a pas produit de fichier".into(),
        ));
    }

    Ok(())
}

/// Si l’entrée n’est pas lisible par sips, passe par un PNG temporaire FFmpeg.
pub fn prepare_sips_input(input: &str) -> Result<(PathBuf, bool), FfmpegError> {
    let ext = extension_of(input);
    if matches!(
        ext.as_str(),
        "jpg" | "jpeg" | "png" | "tif" | "tiff" | "gif" | "bmp" | "heic" | "heif" | "jp2" | "psd"
            | "tga"
    ) {
        return Ok((PathBuf::from(input), false));
    }

    let tmp = std::env::temp_dir().join(format!(
        "converter-sips-{}.png",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    ));
    let args = build_image_ffmpeg_args(input, tmp.to_str().unwrap_or(""), "png", "high")?;
    let ffmpeg = find_binary("ffmpeg")?;
    let result = Command::new(ffmpeg).args(&args).output()?;
    if !result.status.success() || !tmp.exists() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(FfmpegError::ConversionFailed(stderr.trim().to_string()));
    }
    Ok((tmp, true))
}

pub fn parse_progress_line(line: &str, duration: f64) -> Option<ConversionProgress> {
    // -progress pipe:1 emits key=value lines; out_time_ms is most useful
    if let Some(ms_str) = line.strip_prefix("out_time_ms=") {
        let ms: f64 = ms_str.trim().parse().ok()?;
        let time_secs = ms / 1_000_000.0;
        let percent = if duration > 0.0 {
            ((time_secs / duration) * 100.0).clamp(0.0, 99.5)
        } else {
            0.0
        };
        return Some(ConversionProgress {
            percent,
            time_secs,
            speed: None,
        });
    }

    if let Some(speed) = line.strip_prefix("speed=") {
        return Some(ConversionProgress {
            percent: 0.0,
            time_secs: 0.0,
            speed: Some(speed.trim().to_string()),
        });
    }

    None
}

pub fn default_output_path(input: &str, format: &str) -> String {
    let path = Path::new(input);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let parent = path.parent().unwrap_or_else(|| Path::new("."));

    let ext = match format {
        "hevc" => "mp4",
        "jpeg" => "jpg",
        "heif" => "heic",
        other => other,
    };

    parent
        .join(format!("{stem}-converted.{ext}"))
        .to_string_lossy()
        .to_string()
}
