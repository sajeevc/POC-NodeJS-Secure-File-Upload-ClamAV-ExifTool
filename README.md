# Secure file uploads in Express.js

An Express implementation of the NestJS upload pipeline from
[Kamal Jain’s guide](https://devkamal.medium.com/securing-file-uploads-in-nestjs-a-complete-guide-to-implementing-clamav-for-virus-scanning-and-a152a6f021d6):
ClamAV scans every file, ExifTool strips metadata, then the sanitized file is stored.

## What happens on upload

1. Multer writes the file to `data/tmp` with a 10 MB cap.
2. The resolved path must stay inside the app directories (blocks traversal).
3. ClamAV (`clamdscan` when the daemon is up, otherwise `clamscan`) scans the file.
4. Infected files are deleted and the API returns `400`.
5. ExifTool runs `-all= -overwrite_original`.
6. The clean file is copied to `data/uploads` and the temp file is removed.

Local disk storage replaces the article’s Azure blob step so the app runs without cloud credentials.

## Prerequisites

- Node.js 20+
- [ClamAV](https://www.clamav.net/) (`clamscan` and optionally `clamd`)
- [ExifTool](https://exiftool.org/)

On Debian/Ubuntu:

```bash
sudo apt-get install clamav clamav-daemon libimage-exiftool-perl
sudo freshclam
sudo service clamav-daemon start
```

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://127.0.0.1:43127. The UI reports whether ClamAV is ready, lets you upload a file, and can send the standard EICAR test string (harmless, used only to prove rejection).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Scanner status and size limit |
| `POST` | `/api/uploads` | `multipart/form-data` field `file` |
| `GET` | `/api/uploads` | Stored (clean) files |
| `GET` | `/api/uploads/:id` | Scan + metadata report |
| `GET` | `/api/uploads/:id/download` | Download the sanitized file |

Example:

```bash
curl -F file=@photo.jpg http://127.0.0.1:43127/api/uploads
```

A virus hit looks like:

```json
{ "error": "File contains a virus and was discarded", "viruses": ["Eicar-Test-Signature"] }
```

## Docker

```bash
docker compose up --build
```

The image installs ClamAV and ExifTool the same way as the article’s Alpine snippet, using Debian slim so the ClamAV packages stay current.

## Configuration

See `.env.example`. Set `REQUIRE_CLAMAV=1` in production so uploads fail closed if the scanner cannot start.
