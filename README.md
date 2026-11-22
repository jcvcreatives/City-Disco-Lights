# Neon Nights: Nightclub City Tycoon (60fps 2.5D Isometric Web & Mobile Game)

**Neon Nights** is a 60fps 2.5D isometric social nightclub-management simulation game inspired by *Nightclub City*. Start with a gritty single-story dive bar with exposed brick walls, warm Edison string lights, and a glowing 6x6 pastel disco floor, and expand into a multi-floor VIP mega-club.

## Key Features
- **60fps 2.5D Isometric Engine:** Hardware-accelerated HTML5 `<canvas>` with zero-allocation frame loop, compatible with all desktop browsers, Android phones, and iOS devices.
- **Front Entrance, Velvet Rope Queue & Foreground Parking Lot:** Watch cars park in the front lot, guests queue along the velvet ropes under warm streetlights, and bouncers check guests through the VIP entrance archway.
- **Staff Management System:** Hire and station **Bartenders**, **Bouncers**, and **Waiters** anywhere on the isometric grid to automate drink crafting, VIP table service, and door security.
- **Global Day/Night Cycle & Neon Emissive Glow:** Real-time club clock progresses from Golden Sunset to Midnight Neon Peak and Afterhours Glow, dynamically darkening the scene and intensifying neon emissive bloom on placed items.
- **SVG Particle Hype Blast Overlay:** Triggers an explosive 60fps SVG particle shockwave over the dance floor whenever your club's Hype or Tip Multiplier increases.
- **Multi-Floor Expansion (Floor 1 & Floor 2 VIP Sky Lounge):** Unlock the second story and watch guests pathfind upstairs.

---

## How to Publish Your Repo to GitHub so Other Players Can Play

This project is pre-configured with `base: './'` in `vite.config.ts` and includes an automatic **GitHub Pages** deployment workflow at `.github/workflows/deploy.yml`.

### Step 1: Create a GitHub Repository & Push
1. Create a new public repository on [github.com/new](https://github.com/new) (for example, `neon-nights-tycoon`).
2. Run the following commands in your project folder:
```bash
git init
git add .
git commit -m "Initial release: Neon Nights 60fps 2.5D Nightclub Tycoon"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

### Step 2: Enable GitHub Pages (1 Click)
1. Go to your repository on GitHub and click **Settings** -> **Pages** (in the left sidebar).
2. Under **Build and deployment -> Source**, select **GitHub Actions**.
3. Wait ~60 seconds for the `Deploy Neon Nights to GitHub Pages` action to finish.
4. Your playable game will be live at:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPO_NAME>/`

---

## Local Development

```bash
npm install
npm run dev
```
To build a static production bundle (`dist/` folder):
```bash
npm run build
```
