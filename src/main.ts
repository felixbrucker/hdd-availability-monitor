import {defaultLogger} from './logging/logger.js'
import {Config} from './config/config.js'
import {Discord} from './subscriber/discord.js'
import {HddAvailabilityObserver} from './hdd-availability/hdd-availability-observer.js'
import {Logger} from './subscriber/logger.js'
import {hostname} from 'os'

const { default: packageJson } = await import('../package.json', { assert: { type: 'json' } })

process.on('unhandledRejection', (err: Error) => defaultLogger.error(err))
process.on('uncaughtException', (err: Error) => defaultLogger.error(err))

defaultLogger.info(`HDD-Availability-Monitor ${packageJson.version}`)

const config = new Config()
if (!await config.isAccessible()) {
  await config.save()
}
await config.load()

if (config.hddPaths.length === 0) {
  defaultLogger.warn(`No hdd paths configured, exiting ..`)

  process.exit(0)
}

const hddAvailabilityObserver = new HddAvailabilityObserver(config.hddPaths, config.checkIntervalInSeconds)
const logSubscriber = new Logger(hddAvailabilityObserver.availabilityChangedEvents)

let discordSubscriber: Discord|undefined
if (config.discordBotToken && config.discordNotificationUserId) {
  const client = await Discord.makeAuthenticatedDiscordClient(config.discordBotToken)
  discordSubscriber = new Discord(
    client,
    config.discordNotificationUserId,
    config.machineName || hostname(),
    hddAvailabilityObserver.availabilityChangedEvents,
  )
}

await hddAvailabilityObserver.init()

process.on('SIGINT', () => {
  hddAvailabilityObserver.shutdown()
  logSubscriber.shutdown()
  discordSubscriber?.shutdown()
  process.exit()
})
