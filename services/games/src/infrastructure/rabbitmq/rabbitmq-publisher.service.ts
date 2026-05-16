import { Injectable, Logger } from '@nestjs/common'
import * as amqp from 'amqplib'
import type { IBetPlacedEvent, IBetCashedOutEvent, IBetLostEvent } from '../../../../packages/events'

@Injectable()
export class RabbitMQPublisherService {
  private readonly logger = new Logger(RabbitMQPublisherService.name)
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null

  private async getChannel(): Promise<amqp.Channel> {
    if (!this.connection) {
      const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672'
      this.connection = await amqp.connect(rabbitUrl)
      this.channel = await this.connection.createChannel()
      this.logger.log(`Connected to RabbitMQ broker: ${new URL(rabbitUrl).host}`)
    }
    return this.channel!
  }

  async publishBetPlaced(event: IBetPlacedEvent): Promise<void> {
    try {
      const ch = await this.getChannel()
      await ch.assertQueue('games.bet.placed', {
        durable: true,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'games.bet.placed.dlq'
      })
      ch.sendToQueue('games.bet.placed', Buffer.from(JSON.stringify(event)))
      this.logger.log(`Published BetPlaced: ${event.betId}`)
    } catch (error) {
      this.logger.error(
        `Failed to publish BetPlaced: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  async publishBetCashedOut(event: IBetCashedOutEvent): Promise<void> {
    try {
      const ch = await this.getChannel()
      await ch.assertQueue('games.bet.cashed-out', {
        durable: true,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'games.bet.cashed-out.dlq'
      })
      ch.sendToQueue('games.bet.cashed-out', Buffer.from(JSON.stringify(event)))
      this.logger.log(`Published BetCashedOut: ${event.betId}`)
    } catch (error) {
      this.logger.error(
        `Failed to publish BetCashedOut: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  async publishBetLost(event: IBetLostEvent): Promise<void> {
    try {
      const ch = await this.getChannel()
      await ch.assertQueue('games.bet.lost', {
        durable: true,
        deadLetterExchange: 'dlx',
        deadLetterRoutingKey: 'games.bet.lost.dlq'
      })
      ch.sendToQueue('games.bet.lost', Buffer.from(JSON.stringify(event)))
      this.logger.log(`Published BetLost: ${event.betId}`)
    } catch (error) {
      this.logger.error(
        `Failed to publish BetLost: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.channel.close()
    if (this.connection) await this.connection.close()
  }
}