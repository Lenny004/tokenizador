import { Card } from '@/components/Card/Card';

export default function Page() {
  return (
    <main>
      <Card title="Lámpara de mesa" text="Luz cálida regulable." price="49 €" />
      <Card title="Silla nórdica" text="Destacado del mes." price="89 €" featured />
    </main>
  );
}
