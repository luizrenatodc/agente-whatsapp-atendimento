// Núcleo do agente: decide a resposta sem depender do canal (WhatsApp, site, testes).
export type Intencao = "saudacao" | "horario" | "preco" | "agendar" | "humano" | "desconhecida";
export type Conversa = { telefone: string; comHumano: boolean; falhas: number };
export type Resposta = { texto: string; intencao: Intencao; transferiu: boolean };
export type Modelo = (pergunta: string) => Promise<string | null>;

const REGRAS: [Intencao, string[]][] = [
  ["humano", ["atendente", "humano", "pessoa", "reclamação", "reclamacao"]],
  ["agendar", ["agendar", "marcar", "consulta"]],
  ["preco", ["preço", "preco", "valor", "quanto custa"]],
  ["horario", ["horário", "horario", "abre", "fecha", "funciona"]],
  ["saudacao", ["olá", "ola", "bom dia", "boa tarde", "boa noite"]],
];

export function classificar(texto: string): Intencao {
  const t = texto.toLowerCase();
  for (const [intencao, termos] of REGRAS) if (termos.some((p) => t.includes(p))) return intencao;
  return "desconhecida";
}

const FIXAS: Partial<Record<Intencao, string>> = {
  saudacao: "Olá! Posso ajudar com horários, valores ou agendamento.",
  horario: "Atendemos de segunda a sexta, das 8h às 18h.",
  preco: "A consulta custa R$ 150. Quer agendar?",
  agendar: "Claro! Me diga o melhor dia e período.",
};

export const LIMITE_FALHAS = 2;

export async function responder(c: Conversa, texto: string, modelo?: Modelo): Promise<Resposta> {
  if (c.comHumano) return { texto: "", intencao: "humano", transferiu: true }; // o agente fica em silêncio
  const intencao = classificar(texto);
  const transferir = (msg: string): Resposta => {
    c.comHumano = true;
    return { texto: msg, intencao, transferiu: true };
  };
  if (intencao === "humano") return transferir("Certo, vou chamar alguém da equipe.");
  const fixa = FIXAS[intencao];
  if (fixa) {
    c.falhas = 0;
    return { texto: fixa, intencao, transferiu: false };
  }
  const gerada = modelo ? await modelo(texto).catch(() => null) : null;
  if (gerada) return { texto: gerada, intencao, transferiu: false };
  c.falhas += 1;
  if (c.falhas >= LIMITE_FALHAS) return transferir("Não consegui entender. Vou passar para a equipe.");
  return { texto: "Não entendi. Pode explicar de outro jeito?", intencao, transferiu: false };
}
