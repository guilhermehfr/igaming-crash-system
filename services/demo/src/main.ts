import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (config.nodeEnv === "production") {
    app.enableCors({
      origin: config.cors.origin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  await app.listen(config.port);
  console.log(`Demo service running on port ${config.port}`);
}

bootstrap();
