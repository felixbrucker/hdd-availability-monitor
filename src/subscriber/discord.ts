import {Client, Colors, EmbedBuilder, MessageCreateOptions, MessagePayload, GatewayIntentBits} from 'discord.js'
import {Observable, Subscription} from 'rxjs'

import {makeLogger} from '../logging/logger.js'
import {Subscriber} from './subscriber.js'
import {AvailabilityChangedEvent} from './availability-changed-event.js'


export class Discord implements Subscriber {
  public static async makeAuthenticatedDiscordClient(botToken: string): Promise<Client> {
    const logger = makeLogger({ name: 'Discord' })
    const client = new Client({ intents: [GatewayIntentBits.DirectMessages] })

    await new Promise((resolve, reject) => {
      client.on('ready', resolve)
      client.on('error', (err) => { logger.error(err) })
      client.login(botToken).catch(reject)
    })

    logger.info('Initialized')

    return client
  }

  private readonly subscriptions: Subscription[]

  public constructor(
    private readonly client: Client,
    private readonly notifyUserId: string,
    private readonly machineName: string,
    availabilityChangedEventStream: Observable<AvailabilityChangedEvent>,
  ) {
    this.subscriptions = [
      availabilityChangedEventStream.subscribe(this.handleAvailabilityChangedEvent.bind(this)),
    ]
  }

  public shutdown() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }

  private async handleAvailabilityChangedEvent(event: AvailabilityChangedEvent): Promise<void> {
    const embed = this.makeMessageEmbed()
      .setColor(event.isAvailable ? Colors.Green : Colors.Red)
      .setDescription(`HDD ${event.hddPath} is ${event.isAvailable ? 'available again' : 'unavailable'}`)
    await this.sendMessageToUser({ embeds: [embed] })
  }

  private async sendMessageToUser(message: MessagePayload | MessageCreateOptions) {
    const user = await this.client.users.fetch(this.notifyUserId)
    await user.send(message)
  }

  private makeMessageEmbed(): EmbedBuilder {
    return new EmbedBuilder().setAuthor({ name: this.machineName })
  }
}
