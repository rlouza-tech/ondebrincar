export interface ClubinhoProductApi {
  product: {
    title: string;
    slug: string;
    content?: {
      body?: string;
      excerpt?: string | null;
    };
    meta?: Array<{ key: string; value: string }>;
  };
  meta?: Record<string, string>;
  lowestPrice?: {
    sale: number;
    full: number;
    max_discount?: number;
  };
  genres?: Array<{ name: string }>;
  venues?: Array<{
    name: string;
    address?: {
      neighborhood?: string;
      city?: string;
      state?: string;
    };
  }>;
}

export function getMetaValue(
  api: ClubinhoProductApi,
  key: string,
): string {
  const fromRoot = api.meta?.[key];
  if (fromRoot) {
    return fromRoot;
  }
  const fromArray = api.product.meta?.find((item) => item.key === key);
  return fromArray?.value ?? "";
}
