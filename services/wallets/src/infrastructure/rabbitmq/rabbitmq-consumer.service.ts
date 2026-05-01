import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import * as amqp from 'amqplib'
import type { IBetPlacedEvent, IBetCashedOutEvent } from '../../../../packages/events'
import { DebitWalletUseCase } from '../../application/use-cases/debit-wallet.use-case'
import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case'

@Injectable()
export class RabbitMQConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name)
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null

  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) {
    this.startConsuming()
  }

  private async startConsuming(): Promise<void> {
    try {
      this.connection = await amqp.connect('amqp://admin:admin@localhost:5672')
      this.channel = await this.connection.createChannel()
      this.logger.log('Connected to RabbitMQ')

      await this.channel.assertQueue('games.bet.placed', { durable: true })
      await this.channel.assertQueue('games.bet.cashed-out', { durable: true })
      await this.channel.assertQueue('games.bet.lost', { durable: true })

      this.channel.consume('games.bet.placed', async (msg) => {
        if (msg) {
          const event: IBetPlacedEvent = JSON.parse(msg.content.toString())
          await this.handleBetPlaced(event)
          this.channel?.ack(msg)
        }
      })

      this.channel.consume('games.bet.cashed-out', async (msg) => {
        if (msg) {
          const event: IBetCashedOutEvent = JSON.parse(msg.content.toString())
          await this.handleBetCashedOut(event)
          this.channel?.ack(msg)
        }
      })

      this.channel.consume('games.bet.lost', async (msg) => {
        if (msg) {
          const event: IBetPlacedEvent = JSON.parse(msg.content.toString())
          await this.handleBetLost(event)
          this.channel?.ack(msg)
        }
      })

      this.logger.log('Started consuming RabbitMQ messages')
    } catch (error) {
      this.logger.error(
        `Failed to start consuming: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async handleBetPlaced(msg: IBetPlacedEvent): Promise<void> {
    this.logger.log(`Received BetPlaced: ${msg.betId} for user ${msg.userId}`)

    try {
      const amountInMainUnit = Number(msg.amountInCentavos) / 100
      await this.debitWalletUseCase.execute(msg.userId, amountInMainUnit)
      this.logger.log(`Successfully debited ${amountInMainUnit} from wallet ${msg.userId}`)
    } catch (error) {
      this.logger.error(
        `Failed to process BetPlaced for ${msg.betId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async handleBetCashedOut(msg: IBetCashedOutEvent): Promise<void> {
    this.logger.log(`Received BetCashedOut: ${msg.betId} for user ${msg.userId}`)

    try {
      const winningsInMainUnit = Number(msg.winningsInCentavos) / 100
      await this.creditWalletUseCase.execute(msg.userId, winningsInMainUnit)
      this.logger.log(`Successfully credited ${winningsInMainUnit} to wallet ${msg.userId}`)
    } catch (error) {
      this.logger.error(
        `Failed to process BetCashedOut for ${msg.betId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async handleBetLost(msg: IBetPlacedEvent): Promise<void> {
    this.logger.log(`Received BetLost: ${msg.betId} for user ${msg.userId}`)
    this.logger.log(`Bet ${msg.betId} lost - wallet already debited at placeBet time`)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) await this.channel.close()
    if (this.connection) await this.connection.close()
  }
}