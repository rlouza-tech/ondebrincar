import { createElement } from "react";
import { definePlugin } from "sanity";
import { CatalogoDashboard } from "../components/CatalogoDashboard";

// Ícone de gráfico de barras — React.createElement para evitar JSX em arquivo .ts
function DashboardIcon() {
  return createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "1em",
      height: "1em",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      "aria-hidden": true,
    },
    createElement("rect", { x: 3, y: 12, width: 4, height: 9, rx: 1 }),
    createElement("rect", { x: 10, y: 7, width: 4, height: 14, rx: 1 }),
    createElement("rect", { x: 17, y: 3, width: 4, height: 18, rx: 1 }),
  );
}

export const catalogoDashboardPlugin = definePlugin(() => ({
  name: "catalogo-dashboard",
  tools: [
    {
      name: "catalogo-dashboard",
      title: "Dashboard",
      icon: DashboardIcon,
      component: CatalogoDashboard,
    },
  ],
}));
