import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// El componente es el bloque: el host lleva la clase "card" y el modificador.
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'card',
    '[class.card--featured]': 'featured()',
  },
})
export class CardComponent {
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly price = input<string>();
  readonly image = input<string>();
  readonly alt = input('');
  readonly featured = input(false);
}
