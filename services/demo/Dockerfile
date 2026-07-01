FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/events/package.json packages/events/
COPY services/games/package.json services/games/
COPY services/wallets/package.json services/wallets/
COPY services/demo/package.json services/demo/
RUN bun install --frozen-lockfile
COPY . .
WORKDIR /app/services/demo
EXPOSE 4001
CMD ["bun", "run", "src/main.ts"]
