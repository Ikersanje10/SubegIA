import { Component } from '@angular/core';
import { ExploreComponent } from './components/explore/explore.component';
import { ProjectComponent } from './components/project/project.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { LimitationsComponent } from './components/limitations/limitations.component';

@Component({
  imports: [ExploreComponent, ProjectComponent, HowItWorksComponent, LimitationsComponent],
  selector: 'app-home',
  styleUrl: './home.component.css',
  templateUrl: './home.component.html',
})
export class HomeComponent { }
