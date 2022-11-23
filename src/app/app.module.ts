import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { ScrollingModule } from '@angular/cdk/scrolling';
import { AppComponent } from './app.component';
import { WindowVirtualScrollDirective } from './window-vritual-scroll/window-virtual-scroll.directive';

@NgModule({
  imports: [BrowserModule, ScrollingModule],
  declarations: [AppComponent, WindowVirtualScrollDirective],
  bootstrap: [AppComponent]
})
export class AppModule {}
