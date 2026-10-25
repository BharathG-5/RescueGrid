# RescueGrid frontend

This is the React, TypeScript, and Vite frontend for RescueGrid. For complete
project setup, local backend instructions, testing, GitHub safety, and Vercel
deployment guidance, see the [project README](../README.md).

Run the frontend locally from this directory:

```powershell
npm ci
npm run dev
```

Vercel should use this directory as its Root Directory, `npm run build` as its
build command, and `dist` as its output directory. The frontend runs as an
offline-capable PWA and does not deploy or automatically connect the separate
FastAPI backend.
