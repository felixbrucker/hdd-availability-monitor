import {Observable, Subject} from 'rxjs'
import {AvailabilityChangedEvent} from '../subscriber/availability-changed-event.js'
import {stat} from 'fs/promises'

export class HddAvailabilityObserver {
  public readonly availabilityChangedEvents: Observable<AvailabilityChangedEvent>
  private intervalTimer: NodeJS.Timer|undefined
  private readonly availabilityChangedEventsSubject: Subject<AvailabilityChangedEvent> = new Subject<AvailabilityChangedEvent>()
  private readonly hddAvailabilities: Map<string, boolean>

  public constructor(
    hddPaths: string[],
    private readonly checkIntervalInSeconds: number
  ) {
    this.hddAvailabilities = new Map<string, boolean>(hddPaths.map(path => [path, true]))
    this.availabilityChangedEvents = this.availabilityChangedEventsSubject.asObservable()
  }

  public async init(): Promise<void> {
    await this.updateAvailabilities()
    this.intervalTimer = setInterval(this.updateAvailabilities.bind(this), this.checkIntervalInSeconds * 1000)
  }

  public shutdown() {
    if (this.intervalTimer !== undefined) {
      clearInterval(this.intervalTimer)
      this.intervalTimer = undefined
    }
  }

  private async updateAvailabilities(): Promise<void> {
    await Promise.all(Array.from(this.hddAvailabilities, async ([hddPath, wasAvailable]) => {
      const isAvailable = await this.isHddAvailable(hddPath)
      if (isAvailable !== wasAvailable) {
        this.availabilityChangedEventsSubject.next({ hddPath, isAvailable })
        this.hddAvailabilities.set(hddPath, isAvailable)
      }
    }))
  }

  private async isHddAvailable(path: string): Promise<boolean> {
    try {
      const stats = await stat(path)

      return stats.isBlockDevice() || stats.isDirectory()
    } catch (err) {
      return false
    }
  }
}
