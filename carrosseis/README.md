# Carrosséis Instagram — Licitah

Gerador de carrosséis em HTML/CSS fiéis ao design system da Licitah, prontos
para exportação em PNG (Puppeteer).

## Design system (oficial — `app/globals.css`)

| Token        | Valor      | Uso                                   |
|--------------|------------|---------------------------------------|
| Azul escuro  | `#0a1175`  | capa, CTA, headlines                  |
| Laranja      | `#FF6600`  | destaques e ação                      |
| Off-white    | `#F6F5FA`  | fundo dos slides de conteúdo          |
| Texto        | `#262E3A`  | corpo de texto                        |
| Cinza        | `#7B7B7B`  | numeração e textos de apoio           |
| Fonte        | Montserrat | toda a tipografia (400–800)           |
| Logo         | `logo.png` | anel laranja + azul                   |

- **Formato:** 1080×1350 (4:5 retrato) — maior alcance no feed.
- `components.css` concentra todos os estilos reutilizáveis.
- Cada `slide-XX.html` é renderizável sozinho (Google Fonts + `components.css`).

## Preview

Abra `carrossel-01/index.html` no navegador para ver os 7 slides em grade.

## Exportar para PNG

```bash
npm i -D puppeteer
node carrosseis/carrossel-01/export.mjs
```

Os arquivos saem em `carrossel-01/png/` em 2160×2700 (@2x).

## Placeholders de imagem

Onde houver `.image-placeholder` (cinza `#CCCCCC` + "INSERIR IMAGEM"),
substitua por uma foto real antes de exportar.

## Carrosséis

- **carrossel-01** — TOPO — "O mercado que paga em dia" (7 slides) ✅
