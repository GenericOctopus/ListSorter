import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, concat, interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef
  ) {
    if (this.swUpdate.isEnabled) {
      this.checkForUpdates();
      this.handleUpdates();
    }
  }

  private checkForUpdates(): void {
    // Check for updates every 6 hours
    const appIsStable$ = this.appRef.isStable.pipe(
      first(isStable => isStable === true)
    );
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(async () => {
      try {
        const updateFound = await this.swUpdate.checkForUpdate();
        console.log(updateFound ? 'A new version is available.' : 'Already on the latest version.');
      } catch (err) {
        console.error('Failed to check for updates:', err);
      }
    });
  }

  private handleUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(evt => {
        console.log('Current version:', evt.currentVersion);
        console.log('Available version:', evt.latestVersion);
        
        if (confirm('A new version is available. Load new version?')) {
          window.location.reload();
        }
      });
  }

  async activateUpdate(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    }
  }
}
