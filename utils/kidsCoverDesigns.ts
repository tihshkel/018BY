/**
 * Дизайны обложки для раздела «Первые годы малыша» (albums/kids).
 * Используется только first_page.png. Тип обложки выбирается при экспорте.
 */
export const KIDS_COVER_DESIGNS = [
  // Используем реальные first_page.png из `albums/kids/*`, а не `assets/images/albums/*` —
  // иначе в некоторых категориях превью будут пустыми.
  //
  // Если конкретного DFA нет в репозитории, добавляй его папку в `albums/kids/<DFAxx>/first_page.png`.
  { id: 'dfa_5', image: require('@/albums/kids/DFA5/first_page.png'), sku: 'DFA5', title: 'DFA5' },
  { id: 'dfa_52', image: require('@/albums/kids/DFA52/first_page.png'), sku: 'DFA52', title: 'DFA52' },
  { id: 'dfa_53', image: require('@/albums/kids/DFA53/first_page.png'), sku: 'DFA53', title: 'DFA53' },
  { id: 'dfa_59', image: require('@/albums/kids/DFA59/first_page.png'), sku: 'DFA59', title: 'DFA59' },
] as const;
