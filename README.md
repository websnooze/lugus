# Video Converter

App **locale** macOS (Apple Silicon) : convertisseur vidéo + enregistreur d’écran + captures.

Tauri 2 · React · HeroUI v3 · Rust / FFmpeg · VideoToolbox.

## Prérequis

- macOS 13+ (Apple Silicon recommandé)
- [Bun](https://bun.sh)
- [Rust](https://rustup.rs)
- [FFmpeg](https://ffmpeg.org) : `brew install ffmpeg`
- Xcode Command Line Tools

## Démarrage

```bash
bun install
bun run tauri:dev
```

Build production (app + DMG, non signé) :

```bash
bun run tauri:build
```

## Fonctionnalités

### Convertisseur

- Conversion 100 % locale (aucune donnée envoyée)
- Formats : MP4, HEVC, MOV, WebM, MKV, GIF, MP3
- Accélération **VideoToolbox** pour H.264 / HEVC
- Progression en temps réel, annulation, ouverture dans le Finder
- Presets de format / qualité

### Enregistreur d’écran

- Sources : **écran**, **fenêtre** ou **zone** dessinée dans l’overlay
- Jusqu’à **120 fps** (ProMotion), curseur optionnel, compte à rebours
- Conversion automatique après l’enregistrement (format / qualité choisis)
- Overlay masqué pendant la capture (le cadre UI n’apparaît pas dans la vidéo)
- Arrêt via bouton, **menu tray** ou **raccourci global** (réglable, défaut ⌘⇧8)

### Captures d’écran

- Mêmes choix de source que l’enregistreur (écran / fenêtre / zone)
- Enregistrées dans `Images/Video Converter` (ou `Pictures/Video Converter`)
- Les enregistrements vidéo vont dans `Movies/Video Converter`

### App

- Écran d’accueil Convertisseur / Enregistreur
- Fenêtre sans décorations natives (feux custom, drag titlebar, coins arrondis)
- Tray, lancement au login, 8 langues, thème clair / sombre / système
- Compteurs animés (NumberFlow) + barre de progression ; pas de toasts

### Permissions macOS

Autorise **Enregistrement d’écran** pour Video Converter dans  
Réglages Système → Confidentialité et sécurité → Enregistrement d’écran.

## Stack

| Couche | Techno |
|--------|--------|
| UI | React 19, TypeScript, Tailwind v4, HeroUI v3, Zustand, NumberFlow |
| Shell | Tauri 2 (transparent, tray, autostart, global shortcut) |
| Capture / conversion | Rust + FFmpeg / FFprobe + VideoToolbox |
| Package manager | Bun |
