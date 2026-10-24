import { Component } from '@angular/core';
import { HeaderComponent } from './core/layout/header/header.component';
import { HomeComponent } from './features/home/home.component';
import { FooterComponent } from './core/layout/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, HomeComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
