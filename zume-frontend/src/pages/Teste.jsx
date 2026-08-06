import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, authHeaders } from "../lib/auth";
import "./Teste.css";

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

const ETAPAS = { ENTRADA: "entrada", QUIZ: "quiz", RESULTADO: "resultado" };

export default function Teste() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // — entrada —
  const [arquivo, setArquivo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("Arraste um arquivo (.txt ou .pdf) aqui ou clique para procurar");
  const [dragOver, setDragOver] = useState(false);
  const [texto, setTexto] = useState("");
  const [tema, setTema] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const fileInputRef = useRef(null);

  // — quiz —
  const [etapa, setEtapa] = useState(ETAPAS.ENTRADA);
  const [questoes, setQuestoes] = useState([]);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState([]); // string[]
  const [selecionada, setSelecionada] = useState(null);

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

  async function gerarTeste() {
    if (!tema.trim()) { setErro("Informe o tema do teste."); return; }
    setErro(null);

    let textoMaterial;
    try { textoMaterial = await obterTexto(); } catch (e) { setErro("Erro ao ler arquivo: " + e.message); return; }

    setCarregando(true);

    const mensagem = `Gere exatamente 10 questões de múltipla escolha sobre: ${tema}. ${textoMaterial ? "Use o texto abaixo como base:\n" + textoMaterial : ""}

Responda APENAS com JSON válido, sem texto adicional, sem markdown.
Formato exato:
[{
  "pergunta": "...",
  "opcoes": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "resposta": "A",
  "topico": "nome do subtópico desta questão",
  "explicacao": "por que esta é a resposta correta"
}]`;

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

      setQuestoes(parsed);
      setRespostas([]);
      setIndice(0);
      setSelecionada(null);
      setEtapa(ETAPAS.QUIZ);
    } catch {
      setErro("A IA não retornou questões válidas. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function confirmarResposta() {
    if (!selecionada) return;
    const novas = [...respostas, selecionada];
    setRespostas(novas);

    if (indice + 1 < questoes.length) {
      setIndice(indice + 1);
      setSelecionada(null);
    } else {
      finalizarTeste(novas);
    }
  }

  async function finalizarTeste(todasRespostas) {
    setEtapa(ETAPAS.RESULTADO);

    const acertos = todasRespostas.filter((r, i) => r === questoes[i].resposta).length;
    const topicosErrados = questoes
      .filter((q, i) => todasRespostas[i] !== q.resposta)
      .map((q) => q.topico)
      .filter(Boolean);

    try {
      await fetch(`${API}/testes/salvar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          tema,
          total: questoes.length,
          acertos,
          topicos_errados: topicosErrados,
        }),
      });
    } catch {
      // Falha silenciosa — não bloqueia a exibição do resultado
    }
  }

  function reiniciar() {
    setEtapa(ETAPAS.ENTRADA);
    setQuestoes([]);
    setRespostas([]);
    setIndice(0);
    setSelecionada(null);
    setErro(null);
  }

  if (!token) return null;

  const acertos = respostas.filter((r, i) => r === questoes[i]?.resposta).length;
  const nota = questoes.length > 0 ? Math.round((acertos / questoes.length) * 10) : 0;

  // ── RESULTADO ──────────────────────────────────────────────
  if (etapa === ETAPAS.RESULTADO) {
    const topicosErrados = [...new Set(
      questoes.filter((q, i) => respostas[i] !== q.resposta).map((q) => q.topico).filter(Boolean)
    )];

    return (
      <div className="teste-page">
        <Navbar />
        <div className="teste-container">
          <header>
            <h1>📊 Resultado do Teste</h1>
            <p>Tema: <strong>{tema}</strong></p>
          </header>

          <div className="teste-nota">
            <span className="nota-numero">{nota}</span>
            <span className="nota-label">/ 10</span>
            <p className="nota-desc">{acertos} de {questoes.length} acertos</p>
          </div>

          {topicosErrados.length > 0 && (
            <div className="teste-topicos-errados">
              <h3>⚠️ Tópicos para revisar</h3>
              <ul>
                {topicosErrados.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}

          <div className="teste-gabarito">
            <h3>📋 Gabarito</h3>
            {questoes.map((q, i) => {
              const acertou = respostas[i] === q.resposta;
              return (
                <div key={i} className={`gabarito-item${acertou ? " acerto" : " erro"}`}>
                  <p className="gabarito-pergunta">
                    <strong>{i + 1}.</strong> {q.pergunta}
                  </p>
                  <p className="gabarito-opcoes">
                    {Object.entries(q.opcoes).map(([letra, txt]) => (
                      <span
                        key={letra}
                        className={`gabarito-opcao${letra === q.resposta ? " correta" : ""}${letra === respostas[i] && !acertou ? " errada" : ""}`}
                      >
                        <strong>{letra})</strong> {txt}
                      </span>
                    ))}
                  </p>
                  <p className="gabarito-explicacao">💡 {q.explicacao}</p>
                </div>
              );
            })}
          </div>

          <div className="actions">
            <button className="btn-primary" onClick={reiniciar}>🔄 Novo Teste</button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ───────────────────────────────────────────────────
  if (etapa === ETAPAS.QUIZ) {
    const q = questoes[indice];
    return (
      <div className="teste-page">
        <Navbar />
        <div className="teste-container">
          <header>
            <h1>📝 Teste de Conhecimento</h1>
            <p>Tema: <strong>{tema}</strong></p>
          </header>

          <div className="teste-progresso">
            <span>{indice + 1} / {questoes.length}</span>
            <div className="progresso-barra">
              <div className="progresso-fill" style={{ width: `${((indice + 1) / questoes.length) * 100}%` }} />
            </div>
          </div>

          <div className="teste-card">
            <p className="teste-pergunta">{q.pergunta}</p>
            <div className="teste-opcoes">
              {Object.entries(q.opcoes).map(([letra, txt]) => (
                <button
                  key={letra}
                  className={`opcao-btn${selecionada === letra ? " selecionada" : ""}`}
                  onClick={() => setSelecionada(letra)}
                >
                  <span className="opcao-letra">{letra}</span>
                  <span>{txt}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="actions">
            <button className="btn-primary" disabled={!selecionada} onClick={confirmarResposta}>
              {indice + 1 === questoes.length ? "Finalizar" : "Confirmar →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ENTRADA ────────────────────────────────────────────────
  return (
    <div className="teste-page">
      <Navbar />
      <div className="teste-container">
        <header>
          <h1>📝 Teste de Conhecimento</h1>
          <p>Gere um teste de múltipla escolha com IA a partir do seu material ou tema.</p>
        </header>

        <div className="text-zone" style={{ marginBottom: 16 }}>
          <label htmlFor="tema">Tema do teste</label>
          <input
            id="tema"
            type="text"
            placeholder="Ex: Primeira Guerra Mundial, Fotossíntese, Álgebra Linear..."
            value={tema}
            onChange={(e) => setTema(e.target.value)}
          />
        </div>

        <div
          className={`upload-box${dragOver ? " drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processarArquivo(f); }}
        >
          <span className="upload-icon">📁</span>
          <p>{uploadStatus}</p>
          <span>Opcional — use para basear as questões no seu material</span>
          {arquivo && <span className="file-badge">{arquivo.name.split(".").pop().toUpperCase()} — {(arquivo.size / 1024).toFixed(1)} KB</span>}
          <input type="file" ref={fileInputRef} accept=".txt,.pdf" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) processarArquivo(e.target.files[0]); }} />
        </div>

        {erro && <div className="aviso-erro">⚠️ {erro}</div>}

        <div className="text-zone">
          <label htmlFor="textoDigitado">Ou cole o conteúdo aqui (opcional):</label>
          <textarea
            id="textoDigitado"
            rows={5}
            placeholder="Insira o texto base para as questões..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="actions">
          <button className="btn-primary" disabled={carregando} onClick={gerarTeste}>
            {carregando ? "Gerando..." : "📝 Gerar Teste"}
          </button>
        </div>

        {carregando && <div className="spinner" />}
      </div>
    </div>
  );
}
