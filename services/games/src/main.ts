import "reflect-metadata";
import "@config/configuration";

import { config } from "@config/configuration";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);

	const swaggerConfig = new DocumentBuilder()
		.setTitle("Games Service API")
		.setDescription("API documentation for the Games Service")
		.setVersion("1.0")
		.build();

	const document = SwaggerModule.createDocument(app, swaggerConfig);

	SwaggerModule.setup("api", app, document);

	await app.listen(config.port, "0.0.0.0");

	console.log(`Games service running on port ${config.port}`);
}

bootstrap();
