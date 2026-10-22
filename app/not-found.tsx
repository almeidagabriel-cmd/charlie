import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Button asChild><Link href="/checklist">Voltar ao checklist</Link></Button>
    </div>
  );
}
