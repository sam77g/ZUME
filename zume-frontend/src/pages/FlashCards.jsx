import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, authHeaders } from "../lib/auth";
import "./FlashCards.css";

async function extrairTextoPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((item) => item.str).join(" ");
    if (texto.length > 4000) break;
  }
  return texto.trim().substring(0, 4000);
}

export default function FlashCards() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [arquivo, setArquivo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Arraste um arquivo (.txt ou .pdf) aqui ou clique para procurar");
  const [dragOver, setDragOver] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [cards, setCards] = useState([]);
  const [indice, setIndice] = useState(0);
  const [virado, setVirado] = useState(false);
  const [dificuldade, setDificuldade] = useState("medio");
  const fileInputRef = useRef(null);

  function processarArquivo(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "pdf"].includes(ext)) {
      setErro("Tipo não suportado. Use .txt ou .pdf");
      return;
    }
    setArquivo(file);
    setUploadStatus(`${ext === "pdf" ? "📄" : "📝"} Arquivo pronto: ${file.name}`);
    setErro(null);
  }

  async function obterTexto() {
    if (texto.trim()) return texto.trim();
    if (!arquivo) return "";
    const ext = arquivo.name.split(".").pop().toLowerCase();
    if (ext === "txt") {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = (e) => resolve(e.target.result.substring(0, 4000));
        r.onerror = () => reject(new Error("Falha ao ler arquivo"));
        r.readAsText(arquivo, "UTF-8");
      });
    }
    return extrairTextoPDF(arquivo);
  }

  async function gerarCards() {
    setErro(null);
    let textoMaterial;
    try { textoMaterial = await obterTexto(); } catch (e) { setErro("Erro ao ler arquivo: " + e.message); return; }
    if (!textoMaterial) { setErro("Escreva algo ou carregue um arquivo primeiro!"); return; }

    setCarregando(true);
    setCards([]);
    setIndice(0);
    setVirado(false);

    const instrucoesDificuldade = {
      muitofacil: "Os cards devem ser extremamente simples: definições básicas, conceitos introdutórios, perguntas diretas com respostas curtas. Gere 5 cards neste nível.",
      facil: "Os cards devem ser simples: conceitos fundamentais, perguntas objetivas. Gere 5 cards neste nível.",
      medio: "Os cards devem exigir compreensão: relações entre conceitos, aplicações práticas. Gere 5 cards neste nível.",
      dificil: "Os cards devem ser desafiadores: análise crítica, detalhes técnicos, casos específicos, exceções. Gere 5 cards neste nível.",
    };

    const distribuicao = {
      muitofacil: { muitofacil: 14, facil: 3, medio: 2, dificil: 1 },
      facil:       { muitofacil: 4,  facil: 10, medio: 4, dificil: 2 },
      medio:       { muitofacil: 2,  facil: 4,  medio: 10, dificil: 4 },
      dificil:     { muitofacil: 1,  facil: 2,  medio: 4, dificil: 13 },
    };

    const dist = distribuicao[dificuldade];

    const mensagem = `A partir do texto abaixo, gere exatamente 20 flash cards para estudo, distribuídos em 4 níveis de dificuldade:
- Muito Fácil: ${dist.muitofacil} cards — ${instrucoesDificuldade.muitofacil}
- Fácil: ${dist.facil} cards — ${instrucoesDificuldade.facil}
- Médio: ${dist.medio} cards — ${instrucoesDificuldade.medio}
- Difícil: ${dist.dificil} cards — ${instrucoesDificuldade.dificil}

Responda APENAS com um array JSON válido, sem texto adicional, sem markdown, sem blocos de código.
Formato exato: [{"frente":"pergunta","verso":"resposta","nivel":"muitofacil|facil|medio|dificil"}]

Texto:
${textoMaterial}`;

    try {
      const res = await fetch(`${API}/ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ mensagem, tipo: "resumo" }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data?.msg || `Erro HTTP ${res.status}`); return; }

      const textoIA = data?.choices?.[0]?.message?.content || "";
      const json = textoIA.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Formato inválido");
      setCards(parsed);
    } catch (e) {
      setErro("A IA não retornou flash cards válidos. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) return null;

  const card = cards[indice];

  return (
    <div className="fc-page">
      <Navbar />
      <div className="fc-container">
        <header>
          <h1>🃏 Flash Cards com IA</h1>
          <p>Gere cartões de estudo automaticamente a partir do seu material.</p>
        </header>

        {cards.length === 0 && (
          <div className="fc-dificuldade">
            <p className="fc-dif-titulo">Nível de dificuldade</p>
            <div className="fc-dif-opcoes">
              {[
                { id: "muitofacil", label: "😊 Muito Fácil" },
                { id: "facil",      label: "🙂 Fácil" },
                { id: "medio",      label: "😤 Médio" },
                { id: "dificil",    label: "💀 Difícil" },
              ].map((op) => (
                <button
                  key={op.id}
                  className={`fc-dif-btn${dificuldade === op.id ? " ativo" : ""}`}
                  onClick={() => setDificuldade(op.id)}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {cards.length === 0 && (
          <>
            <div
              className={`upload-box${dragOver ? " drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processarArquivo(f); }}
            >
              <span className="upload-icon">📁</span>
              <p>{uploadStatus}</p>
              <span>Suporta arquivos de texto e PDF</span>
              {arquivo && <span className="file-badge">{arquivo.name.split(".").pop().toUpperCase()} — {(arquivo.size / 1024).toFixed(1)} KB</span>}
              <input type="file" ref={fileInputRef} accept=".txt,.pdf" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) processarArquivo(e.target.files[0]); }} />
            </div>

            {erro && <div className="aviso-erro">⚠️ {erro}</div>}

            <div className="text-zone">
              <label>Ou digite/cole seu texto aqui:</label>
              <textarea rows={6} placeholder="Insira o conteúdo para gerar os flash cards..." value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>

            <div className="actions">
              <button className="btn-primary" disabled={carregando} onClick={gerarCards}>
                {carregando ? "Gerando..." : "🃏 Gerar Flash Cards"}
              </button>
            </div>

            {carregando && <div className="spinner" />}
          </>
        )}

        {cards.length > 0 && (
          <div className="fc-viewer">
            <p className="fc-progresso">
              {indice + 1} / {cards.length}
              {card.nivel && (
                <span className={`fc-nivel-badge fc-nivel-${card.nivel}`}>
                  {{ muitofacil: "😊 Muito Fácil", facil: "🙂 Fácil", medio: "😤 Médio", dificil: "💀 Difícil" }[card.nivel]}
                </span>
              )}
            </p>

            <div className={`fc-card${virado ? " virado" : ""}`} onClick={() => setVirado(!virado)}>
              <div className="fc-card-inner">
                <div className="fc-frente">
                  <span className="fc-label">Pergunta</span>
                  <p>{card.frente}</p>
                </div>
                <div className="fc-verso">
                  <span className="fc-label">Resposta</span>
                  <p>{card.verso}</p>
                </div>
              </div>
            </div>

            <p className="fc-dica">Clique no card para revelar a resposta</p>

            <div className="fc-nav">
              <button className="btn-secondary" disabled={indice === 0} onClick={() => { setIndice(i => i - 1); setVirado(false); }}>← Anterior</button>
              <button className="btn-secondary" onClick={() => { setCards([]); setIndice(0); setVirado(false); }}>↺ Novo</button>
              <button className="btn-secondary" disabled={indice === cards.length - 1} onClick={() => { setIndice(i => i + 1); setVirado(false); }}>Próximo →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}