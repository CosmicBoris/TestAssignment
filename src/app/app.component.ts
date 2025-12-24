import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabTrackingService } from './services/tab-tracking.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'TestAssignment';

  constructor(private tabTracking: TabTrackingService) {}
}
