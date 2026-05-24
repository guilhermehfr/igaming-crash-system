FROM oven/bun:1-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .
RUN bun install

WORKDIR /app/services/games
RUN bun x tsc

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
