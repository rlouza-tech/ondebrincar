/**
 * /buscar — rota reservada para busca futura.
 * Até a funcionalidade estar disponível, redireciona para home.
 */
import { redirect } from "next/navigation";

export default function BuscarPage() {
  redirect("/");
}
