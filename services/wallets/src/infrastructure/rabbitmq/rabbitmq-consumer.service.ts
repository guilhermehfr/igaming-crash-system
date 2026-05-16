import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import * as amqp from 'amqplib'
import type { IBetPlacedEvent, IBetCashedOutEvent, IBetLostEvent } from '../../../../packages/events'
import { DebitWalletUseCase } from '../../application/use-cases/debit-wallet.use-case'
import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case'
import type { IConsumedEventRepository } from '../../domain/consumed-event.repository'
import { EventType } from '../../domain/consumed-event.repository'

const MAX_RETRIES = 3

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    )
  ])
}

@Injectable()
export class RabbitMQConsumerService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(RabbitMQConsumerService.name)
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null

  constructor(
    private readonly debitWalletUseCase: DebitWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
    @Inject('IConsumedEventRepository') private readonly consumedEventRepository: IConsumedEventRepository,
  ) {
    this.logger.log('[RABBITMQ] Service instantiated')
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('[RABBITMQ] onModuleInit called')
    await this.startConsuming()
  }

  private async startConsuming(): Promise<void> {
    const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672'
    this.logger.log(`[RABBITMQ] STARTING - URL: ${rabbitUrl}`)

    try {
      // Step 1: Connect with timeout
      this.logger.log('[RABBITMQ] → Attempting connection to broker...')
      this.connection = await withTimeout(amqp.connect(rabbitUrl), 5000, 'connect')
      this.logger.log(`[RABBITMQ] ✓ Connected - broker host: ${new URL(rabbitUrl).host}`)

      // Connection lifecycle events
      this.connection.on('error', (err) => {
        this.logger.error(`[RABBITMQ] Connection ERROR: ${err.message}`)
      })
      this.connection.on('close', () => {
        this.logger.warn(`[RABBITMQ] Connection CLOSED`)
      })

      // Step 2: Create channel with timeout
      this.logger.log('[RABBITMQ] → Creating channel...')
      this.channel = await withTimeout(this.connection.createChannel(), 5000, 'createChannel')
      this.logger.log('[RABBITMQ] ✓ Channel created')

      // Channel lifecycle events
      this.channel.on('error', (err) => {
        this.logger.error(`[RABBITMQ] Channel ERROR: ${err.message}`)
      })
      this.channel.on('close', () => {
        this.logger.warn('[RABBITMQ] Channel CLOSED')
      })

      // Step 3: Setup DLX exchange
      this.logger.log('[RABBITMQ] → Setting up DLX exchange...')
      await this.channel.assertExchange('dlx', 'direct', { durable: true })
      this.logger.log('[RABBITMQ] ✓ DLX exchange "dlx" created')

      // Step 4: Setup DLQ queues with assertion and binding
      const dlqTTL = 604800000 // 7 days
      const dlqQueues = ['games.bet.placed.dlq', 'games.bet.cashed-out.dlq', 'games.bet.lost.dlq']

      for (const dlqName of dlqQueues) {
        this.logger.log(`[RABBITMQ] → Creating DLQ: ${dlqName}`)
        await this.channel.assertQueue(dlqName, { durable: true, arguments: { 'x-message-ttl': dlqTTL }})
        this.logger.log(`[RABBITMQ] ✓ DLQ asserted: ${dlqName}`)
        
        const routingKey = dlqName
        await this.channel.bindQueue(dlqName, 'dlx', routingKey)
        this.logger.log(`[RABBITMQ] ✓ DLQ bound to dlx with routingKey: ${routingKey}`)
      }

      // Step 5: Assert main queues with DLX routing
      const mainQueues = [
        { name: 'games.bet.placed', dlq: 'games.bet.placed.dlq' },
        { name: 'games.bet.cashed-out', dlq: 'games.bet.cashed-out.dlq' },
        { name: 'games.bet.lost', dlq: 'games.bet.lost.dlq' }
      ]

      for (const queue of mainQueues) {
        this.logger.log(`[RABBITMQ] → Asserting main queue: ${queue.name}`)
        await this.channel.assertQueue(queue.name, {
          durable: true,
          deadLetterExchange: 'dlx',
          deadLetterRoutingKey: queue.dlq
        })
        this.logger.log(`[RABBITMQ] ✓ Queue asserted: ${queue.name}`)
      }

      // Step 6: Register consumers
      const consumerResults = []

      this.logger.log('[RABBITMQ] → Registering consumer on: games.bet.placed')
      const result1 = await this.channel.consume('games.bet.placed', (msg) => this.handleMessage(msg, 'games.bet.placed', this.handleBetPlaced.bind(this)))
      this.logger.log(`[RABBITMQ] ✓ Consumer registered on games.bet.placed - tag: ${result1.consumerTag}`)
      consumerResults.push({ queue: 'games.bet.placed', tag: result1.consumerTag })

      this.logger.log('[RABBITMQ] → Registering consumer on: games.bet.cashed-out')
      const result2 = await this.channel.consume('games.bet.cashed-out', (msg) => this.handleMessage(msg, 'games.bet.cashed-out', this.handleBetCashedOut.bind(this)))
      this.logger.log(`[RABBITMQ] ✓ Consumer registered on games.bet.cashed-out - tag: ${result2.consumerTag}`)
      consumerResults.push({ queue: 'games.bet.cashed-out', tag: result2.consumerTag })

      this.logger.log('[RABBITMQ] → Registering consumer on: games.bet.lost')
      const result3 = await this.channel.consume('games.bet.lost', (msg) => this.handleMessage(msg, 'games.bet.lost', this.handleBetLost.bind(this)))
      this.logger.log(`[RABBITMQ] ✓ Consumer registered on games.bet.lost - tag: ${result3.consumerTag}`)
      consumerResults.push({ queue: 'games.bet.lost', tag: result3.consumerTag })

      this.logger.log(`[RABBITMQ] ✓ All consumers registered: ${JSON.stringify(consumerResults)}`)
      this.logger.log('[RABBITMQ] ✓ Consumer setup complete - listening for messages')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(`[RABBITMQ] ✗ FAILED: ${errorMsg}`)
      this.logger.error(`[RABBITMQ] Stack: ${error?.stack}`)
    }
  }

  private async handleMessage(
    msg: amqp.ConsumeMessage | null,
    queueName: string,
    handler: (event: IBetPlacedEvent | IBetCashedOutEvent | IBetLostEvent) => Promise<void>,
  ): Promise<void> {
    if (!msg) return

    const retryCount = (msg.properties.headers?.['x-retry-count'] as number) || 0
    this.logger.log(`[RABBITMQ] Message received on ${queueName}, retry: ${retryCount}, delivery: ${msg.fields.deliveryTag}`)

    try {
      const event = JSON.parse(msg.content.toString())
      this.logger.log(`[RABBITMQ] Parsed event: type=${event.type}, eventId=${event.eventId}`)
      await handler(event)
      this.channel?.ack(msg)
      this.logger.debug(`[RABBITMQ] ✓ Message processed and ACKed`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (retryCount >= MAX_RETRIES) {
        this.logger.error(`[RABBITMQ] Max retries (${MAX_RETRIES}) exceeded - sending to DLQ: ${errorMessage}`)
        this.channel?.nack(msg, false, false) // send to DLQ
      } else {
        this.logger.warn(`[RABBITMQ] Retry ${retryCount + 1}/${MAX_RETRIES} - error: ${errorMessage}`)
        this.channel?.publish('', queueName, msg.content, {
          headers: { ...msg.properties.headers, 'x-retry-count': retryCount + 1 },
          persistent: true,
        })
        this.channel?.ack(msg)
      }
    }
  }

  private async handleBetPlaced(msg: IBetPlacedEvent): Promise<void> {
    this.logger.log(`[HANDLER] Processing BetPlaced: eventId=${msg.eventId}, userId=${msg.userId}, amount=${msg.amountInCentavos}`)

    // Step 1: Atomic claim (DB is source of truth)
    const claimed = await this.consumedEventRepository.tryClaimEvent(
      msg.eventId,
      EventType.BET_PLACED,
      msg.userId
    )
    if (!claimed) {
      this.logger.warn(`[HANDLER] Event ${msg.eventId} already processed - skipping`)
      return
    }

    // Step 2: Execute wallet operation ONLY after successful claim
    const amountInMainUnit = Number(msg.amountInCentavos) / 100
    await this.debitWalletUseCase.execute(msg.userId, amountInMainUnit)
    this.logger.log(`[HANDLER] ✓ Debited ${amountInMainUnit} from wallet ${msg.userId}`)
  }

  private async handleBetCashedOut(msg: IBetCashedOutEvent): Promise<void> {
    this.logger.log(`[HANDLER] Processing BetCashedOut: eventId=${msg.eventId}, userId=${msg.userId}, winnings=${msg.winningsInCentavos}`)

    // Step 1: Atomic claim
    const claimed = await this.consumedEventRepository.tryClaimEvent(
      msg.eventId,
      EventType.BET_CASHED_OUT,
      msg.userId
    )
    if (!claimed) {
      this.logger.warn(`[HANDLER] Event ${msg.eventId} already processed - skipping`)
      return
    }

    // Step 2: Execute wallet operation ONLY after successful claim
    const winningsInMainUnit = Number(msg.winningsInCentavos) / 100
    await this.creditWalletUseCase.execute(msg.userId, winningsInMainUnit)
    this.logger.log(`[HANDLER] ✓ Credited ${winningsInMainUnit} to wallet ${msg.userId}`)
  }

  private async handleBetLost(msg: IBetLostEvent): Promise<void> {
    this.logger.log(`[HANDLER] Processing BetLost: eventId=${msg.eventId}, userId=${msg.userId}`)

    // Claim event first (atomic) - no wallet operation needed
    const claimed = await this.consumedEventRepository.tryClaimEvent(
      msg.eventId,
      EventType.BET_LOST,
      msg.userId
    )
    if (!claimed) {
      this.logger.warn(`[HANDLER] Event ${msg.eventId} already processed - skipping`)
      return
    }

    this.logger.log(`[HANDLER] Bet ${msg.betId} lost - wallet already debited at placeBet time`)
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('[RABBITMQ] Shutting down...')
    if (this.channel) {
      await this.channel.close()
      this.logger.log('[RABBITMQ] Channel closed')
    }
    if (this.connection) {
      await this.connection.close()
      this.logger.log('[RABBITMQ] Connection closed')
    }
  }
}