# Video Converter

Convertisseur vidéo **local** pour macOS Apple Silicon — Tauri 2 + React + HeroUI v3 + Rust/FFmpeg.

## Prérequis

- macOS 13+ (Apple Silicon)
- [Bun](https://bun.sh)
- [Rust](https://rustup.rs)
- [FFmpeg](https://ffmpeg.org) : `brew install ffmpeg`
- Xcode Command Line Tools

## Démarrage

```bash
bun install
bun run tauri:dev
```

Build production :

```bash
bun run tauri:build
```

## Fonctionnalités

- Conversion 100 % locale (aucune donnée envoyée)
- Formats : MP4, HEVC, MOV, WebM, MKV, GIF, MP3
- Accélération **VideoToolbox** pour H.264 / HEVC
- Progression en temps réel, annulation, ouverture dans le Finder
- **Enregistreur d’écran** : plein écran, fenêtre ou zone dessinée
- Compte à rebours optionnel, curseur, jusqu’à **120 fps** (ProMotion)
- Conversion automatique après l’enregistrement
- 8 langues + thème clair / sombre / système + presets

### Permission macOS

Pour l’enregistreur, autorise **Enregistrement d’écran** pour Video Converter dans  
Réglages Système → Confidentialité et sécurité → Enregistrement d’écran.

## Stack

| Couche | Techno |
|--------|--------|
| UI | React 19, TypeScript, Tailwind v4, HeroUI v3, Zustand, Motion |
| Shell | Tauri 2 |
| Conversion | Rust + FFmpeg / FFprobe |
| Package manager | Bun |
