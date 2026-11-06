// Webhook no formato da WhatsApp Cloud API. O envio real fica em enviar().
import { createServer } from "node:http";
import { responder, type Conversa } from "./agente.ts";

const TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
const conversas = new Map<string, Conversa>();

async function enviar(telefone: string, texto: string) {
  console.log(`-> ${telefone}: ${texto}`); // troque pela chamada à Graph API
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/webhook") {
    const ok = TOKEN && url.searchParams.get("hub.verify_token") === TOKEN;
    res.writeHead(ok ? 200 : 403).end(ok ? url.searchParams.get("hub.challenge") ?? "" : "");
    return;
  }
  if (req.method === "POST" && url.pathname === "/webhook") {
    let corpo = "";
    for await (const parte of req) corpo += parte;
    res.writeHead(200).end(); // a Meta reenvia se a resposta demorar
    const msg = JSON.parse(corpo || "{}").entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg?.type !== "text") return;
    const c = conversas.get(msg.from) ?? { telefone: msg.from, comHumano: false, falhas: 0 };
    conversas.set(msg.from, c);
    const r = await responder(c, msg.text.body);
    if (r.texto) await enviar(msg.from, r.texto);
    return;
  }
  res.writeHead(404).end();
}).listen(Number(process.env.PORT ?? 3000));
