FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    clamav \
    clamav-daemon \
    clamav-freshclam \
    libimage-exiftool-perl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .

ENV PORT=43127
ENV REQUIRE_CLAMAV=1
EXPOSE 43127

CMD ["sh", "-c", "freshclam || true; clamd; npm start"]
