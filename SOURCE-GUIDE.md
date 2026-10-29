# Application source snapshot

`omsetra-application-source.zip` contains the application's tracked source, database migrations, tests, vendored license notices and dependency lockfile, exported from commit `4645ec0d544950f281a2b5774f42f54ba340e82b`.

This is a source archive, not a binary build or a backup of production users. Git history, generated builds, runtime databases, uploaded documents, environment files, credentials and the original Sites project ID are excluded. `SOURCE-SHA256.txt` inside the archive records file hashes.

## Local development

1. Extract the archive into its own folder.
2. Install Node.js 22.13 or newer and Git.
3. Run `npm ci` in the extracted folder.
4. Run `npm run dev` for the loopback development preview.
5. See the included original README, SETUP.md and RECONCILIATION-MVP.md for local D1 migration instructions and existing limitations.

The portable developer preview uses a local mock identity. A fresh local database requires migrations; an empty database is not an application failure. No real merchant credentials are included.

Verification on the original source snapshot: TypeScript check, production build and 38 tests passed on 26 October 2026. This export does not claim that every alternative hosting environment has been tested.

## Production hosting

GitHub stores source; GitHub Pages can serve the static product information page. The application also needs a Worker runtime, D1 database, trusted authentication and runtime secrets. GitHub Pages alone cannot run its authenticated APIs or payment backend.

The existing live application stays at https://astrobharat-studio.hp909145.chatgpt.site/ . Publishing this archive does not move the database, configure GitHub-to-Sites deployment synchronization or turn on payments.

To establish a normal browsable Git source tree later, extract this archive in an authorized clone of Omi811/omsetra, review it, commit it and push through that account's normal Git authentication. Do not overwrite existing product documentation without merging it. The live Sites source repository remains separate until an explicit supported deployment integration is configured.

## License

Publishing source does not itself grant an open-source license. Retain all included third-party license notices. Omsetra's own license remains undecided; do not describe this repository as open source until a license is chosen.
