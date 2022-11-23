import { Component } from '@angular/core';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  items: number[] = Array.from(Array(1500).keys()).map((i) =>
    i % 2 ? 50 : 100
  );
}
