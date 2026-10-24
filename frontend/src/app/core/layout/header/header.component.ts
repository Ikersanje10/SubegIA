import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  selector: 'app-header',
  styleUrl: './header.component.css',
  templateUrl: './header.component.html',
})
export class HeaderComponent {

  languages = ['es', 'en', 'eu'];
  selectedLanguage = signal('es');

  private translationService = inject(TranslateService)
  menuOpen: WritableSignal<boolean> = signal(false);
  selectedIndex = computed(() => this.languages.indexOf(this.selectedLanguage()));

  updateLanguage(language: string) {
    this.translationService.use(language);
    this.selectedLanguage.set(language);
  }

  toggle() {
    this.menuOpen.update(value => !value);
  }

  close() {
    this.menuOpen.set(false);
  }
}
