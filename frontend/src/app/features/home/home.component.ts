import { Component } from '@angular/core';
import { ExploreComponent } from './components/explore/explore.component';

@Component({
  imports: [ExploreComponent],
  selector: 'app-home',
  styleUrl: './home.component.css',
  templateUrl: './home.component.html',
})
export class HomeComponent { }
