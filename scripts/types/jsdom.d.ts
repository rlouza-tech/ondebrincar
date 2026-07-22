/**
 * jsdom não publica tipos próprios e o projeto não tem @types/jsdom instalado
 * (débito conhecido: scripts/ fica fora do tsc oficial — ver tsconfig.json).
 * Declaração ambiente mínima só para o que scripts/scraper/uhuu.ts usa.
 */
declare module "jsdom" {
  export class JSDOM {
    constructor(html: string);
    window: {
      document: Document;
    };
  }
}
