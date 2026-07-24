FROM oven/bun:1-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

RUN bun install

WORKDIR /app/frontend
RUN bun run build

EXPOSE 80

CMD ["bun", "run", "preview", "--", "--port", "80", "--host"]
