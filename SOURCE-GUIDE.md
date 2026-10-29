# Application source

The browsable source tree is now in [application/](application/). It contains 183 tracked source files from commit `4645ec0d544950f281a2b5774f42f54ba340e82b`, plus the snapshot metadata and per-file checksums. The original ZIP remains as a historical snapshot.

## Local development

Install Node.js 22.13 or newer and Git. Run `cd application`, `npm ci`, then `npm run dev`. A fresh local D1 database requires the migrations described in [application/README.md](application/README.md) and [application/SETUP.md](application/SETUP.md). Portable mock identity is for loopback development only.

## Publication boundaries

Credentials, environment files, production databases, user uploads, Git history and the original hosting project ID are excluded. All 183 file checksums and the archive SHA-256 were verified before import. Existing application code was preserved byte for byte.

GitHub Pages serves the static product-information page only. The authenticated application and database stay on existing hosting. No automatic deployment synchronization has been configured. Live payments remain disabled pending Razorpay approval, configuration and testing.

No open-source license for Omsetra has been selected. Retain all included third-party license notices. Source availability does not itself grant an open-source license.
