# Lugus

App **locale** macOS (Apple Silicon) : convertisseur vidéo & image + enregistreur d’écran + captures.

Tauri 2 · React · HeroUI v3 · Rust / FFmpeg · VideoToolbox · sips (HEIC).

## Installation

1. Télécharge le DMG depuis les [Releases](https://github.com/websnooze/lugus/releases) (`Lugus_*_aarch64.dmg`, Apple Silicon)
2. Ouvre le DMG et glisse **Lugus** dans Applications

### Si macOS affiche « Lugus.app est endommagé… »

Le build n’est pas encore signé / notarié : Gatekeeper bloque le fichier téléchargé (quarantaine), ce n’est pas une corruption. Dans le **Terminal** :

```bash
xattr -cr /Applications/Lugus.app
open /Applications/Lugus.app
```

(Adapte le chemin si l’app n’est pas dans Applications.)

Au premier lancement, autorise aussi **Enregistrement d’écran** dans  
Réglages Système → Confidentialité et sécurité → Enregistrement d’écran.

## Développement

### Prérequis

- macOS 13+ (Apple Silicon recommandé)
- [Bun](https://bun.sh)
- [Rust](https://rustup.rs)
- [FFmpeg](https://ffmpeg.org) : `brew install ffmpeg`
- Xcode Command Line Tools

### Démarrage

```bash
bun install
bun run tauri:dev
```

Build production (app + DMG, non signé) :

```bash
bun run tauri:build
```

### Icône macOS (Icon Composer)

L’icône native est `src-tauri/icons/AppIcon.icon` (Liquid Glass / variants système).  
Après modification dans Icon Composer, recompiler le catalogue :

```bash
actool src-tauri/icons/AppIcon.icon --compile /tmp/vc-icon \
  --platform macosx --minimum-deployment-target 15.0 \
  --app-icon AppIcon --include-all-app-icons \
  --output-partial-info-plist /tmp/vc-icon/partial.plist
cp /tmp/vc-icon/Assets.car src-tauri/Assets.car
cp /tmp/vc-icon/AppIcon.icns src-tauri/icons/icon.icns
```

`Assets.car` + `CFBundleIconName=AppIcon` pour macOS récent ; `icon.icns` en fallback.

## Fonctionnalités

### Convertisseur

- Conversion 100 % locale (aucune donnée envoyée)
- **Vidéo** : MP4, HEVC, MOV, WebM, MKV, GIF, MP3 — accélération **VideoToolbox**
- **Image** : JPG, PNG, WebP, HEIC, AVIF, TIFF, BMP, GIF, JXL, JP2 (HEIC/JP2 via ImageIO/`sips`)
- Progression en temps réel, annulation, ouverture dans le Finder
- Presets de format / qualité

### Enregistreur d’écran

- Sources : **écran**, **fenêtre** ou **zone** dessinée dans l’overlay
- Jusqu’à **120 fps** (ProMotion), curseur optionnel, compte à rebours
- Conversion automatique après l’enregistrement (format / qualité choisis)
- Overlay **NSPanel** macOS : reste visible au-dessus des apps fullscreen et entre les Spaces
- Overlay masqué pendant la capture (le cadre UI n’apparaît pas dans la vidéo)
- Arrêt via bouton, **menu tray** ou **raccourci global** (réglable, défaut ⌘⇧8)

### Captures d’écran

- Mêmes choix de source que l’enregistreur (écran / fenêtre / zone)
- Enregistrées dans `Images/Lugus` (ou `Pictures/Lugus`)
- Les enregistrements vidéo vont dans `Movies/Lugus`

### App

- Écran d’accueil Convertisseur / Enregistreur
- Fenêtre sans décorations natives (feux custom, drag titlebar, coins arrondis)
- App agent (pas d’icône Dock) : démarrage en arrière-plan via le tray, lancement au login, 8 langues, thème sombre
- Compteurs animés (NumberFlow) + barre de progression ; pas de toasts

## Stack

| Couche | Techno |
|--------|--------|
| UI | React 19, TypeScript, Tailwind v4, HeroUI v3, Zustand, NumberFlow |
| Shell | Tauri 2 + tauri-nspanel (overlay Spaces/fullscreen, tray, autostart, hotkey) |
| Capture / conversion | Rust + FFmpeg / FFprobe + VideoToolbox |
| Package manager | Bun |
