import {Observable, Subscription} from 'rxjs'

import {defaultLogger} from '../logging/logger.js'
import {AvailabilityChangedEvent} from './availability-changed-event.js'
import {Subscriber} from './subscriber.js'

export class Logger implements Subscriber {
  private readonly subscriptions: Subscription[]

  public constructor(
    availabilityChangedEventStream: Observable<AvailabilityChangedEvent>,
  ) {
    this.subscriptions = [
      availabilityChangedEventStream.subscribe(this.handleAvailabilityChangedEvent.bind(this)),
    ]
  }

  public shutdown() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }

  private handleAvailabilityChangedEvent(event: AvailabilityChangedEvent): void {
    if (event.isAvailable) {
      defaultLogger.info(`✔ HDD ${event.hddPath} is available again`)
    } else {
      defaultLogger.error(`❌  HDD ${event.hddPath} is unavailable`)
    }
  }
}
