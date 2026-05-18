import type { Metadata } from "next";
import { DesignSystemShowcase } from "./design-system-showcase";

export const metadata: Metadata = {
  title: "Design System — Onde Brincar",
  description: "Componentes base e estados visuais do Onde Brincar.",
};

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary/10 bg-white px-6 py-8">
        <p className="text-sm font-medium uppercase tracking-wide text-success">
          US-S3.2
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-primary">
          Design System
        </h1>
        <p className="mt-2 max-w-2xl text-base text-secondary">
          Button, Card, FilterChip e AtracaoCard — variantes e estados para
          validação em 320px, 768px e 1024px.
        </p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <DesignSystemShowcase />
      </main>
    </div>
  );
}
