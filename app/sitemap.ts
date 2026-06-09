import type { MetadataRoute } from "next";
import { getAtracaoSlugsAtivos } from "@/lib/atracoes";

const BASE_URL = "https://ondebrincar.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAtracaoSlugsAtivos();

  const atracaoUrls: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/atracao/${slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...atracaoUrls,
  ];
}
