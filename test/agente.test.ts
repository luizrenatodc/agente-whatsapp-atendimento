import test from "node:test";
import assert from "node:assert/strict";
import { classificar, responder, type Conversa } from "../src/agente.ts";

const nova = (): Conversa => ({ telefone: "1", comHumano: false, falhas: 0 });

test("classifica intenções", () => {
  assert.equal(classificar("Quanto custa?"), "preco");
  assert.equal(classificar("quero falar com um atendente"), "humano");
});
test("transfere depois de duas falhas e fica em silêncio", async () => {
  const c = nova();
  assert.equal((await responder(c, "xpto")).transferiu, false);
  assert.equal((await responder(c, "xpto")).transferiu, true);
  assert.equal((await responder(c, "preço")).texto, "");
});
test("usa o modelo quando não há regra e sobrevive a erro dele", async () => {
  assert.equal((await responder(nova(), "xpto", async () => "gerado")).texto, "gerado");
  const r = await responder(nova(), "xpto", async () => { throw new Error("fora do ar"); });
  assert.match(r.texto, /Não entendi/);
});
