import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API } from "../lib/api";
import { getUsuario, authHeaders } from "../lib/auth";
import "./EstudoIA.css";

async function extrairTextoPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoTotal = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const textoDaPagina = content.items.map((item) => item.str).join(" ");
    textoTotal += `\n--- Página ${i} ---\n${textoDaPagina}`;
    if (textoTotal.length > 4000) break;
  }
  return textoTotal.trim().substring(0, 4000);
}

// Protege fórmulas LaTeX ($...$, $$...$$, \(...\), \[...\]) antes do marked.parse,
// para o parser de Markdown não quebrar a sintaxe matemática.
function renderMd(text) {
  const slots = [];
  const hold = (m) => {
    slots.push(m);
    return `\x00MATH${slots.length - 1}\x00`;
  };
  let t = text
    .replace(/\$\$[\s\S]+?\$\$/g, hold)
    .replace(/\\\[[\s\S]+?\\\]/g, hold)
    .replace(/\\\(.+?\\\)/g, hold)
    .replace(/\$[^$\n]+?\$/g, hold);

  let html = window.marked.parse(t);
  slots.forEach((orig, i) => {
    html = html.replaceAll(`\x00MATH${i}\x00`, orig);
  });
  return html;
}

export default function EstudoIA() {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const token = usuario?.token;

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  const [arquivo, setArquivo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(
    "Arraste um arquivo (.txt ou .pdf) aqui ou clique para procurar"
  );
  const [dragOver, setDragOver] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null); // { titulo, html }
  const resultadoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (resultado && resultadoRef.current && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([resultadoRef.current]);
    }
  }, [resultado]);

  function processarArquivo(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["txt", "pdf"].includes(ext)) {
      setErro("Tipo de arquivo não suportado. Use .txt ou .pdf");
      return;
    }
    setArquivo(file);
    const icone = ext === "pdf" ? "📄" : "📝";
    setUploadStatus(`${icone} Arquivo pronto: ${file.name}`);
    setErro(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  }

  function handleSelecionarArquivo(e) {
    const file = e.target.files[0];
    if (file) processarArquivo(file);
  }

  async function obterTextoMaterial() {
    const textoCaixa = texto.trim();
    if (textoCaixa.length > 0) return textoCaixa;
    if (!arquivo) return "";

    const ext = arquivo.name.split(".").pop().toLowerCase();
    if (ext === "txt") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.substring(0, 4000));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo .txt"));
        reader.readAsText(arquivo, "UTF-8");
      });
    } else if (ext === "pdf") {
      return extrairTextoPDF(arquivo);
    }
    return "";
  }

  async function chamarIA(tipoAcao, tituloContainer) {
    setErro(null);

    let textoMaterial;
    try {
      textoMaterial = await obterTextoMaterial();
    } catch (err) {
      setErro("Erro ao ler o arquivo: " + err.message);
      return;
    }

    if (!textoMaterial) {
      setErro("Escreva algo, carregue um arquivo .txt ou .pdf primeiro!");
      return;
    }

    const prompts = {
      resumo: `Resumo completo em pt-BR com títulos, subtítulos e bullets. Destaque conceitos-chave. Use LaTeX para fórmulas ($...$ ou $$...$$).\n\n${textoMaterial}`,
      roteiro: `Roteiro de estudo em pt-BR: etapas progressivas, tempo estimado por parte, dicas de fixação. Use LaTeX para fórmulas ($...$ ou $$...$$).\n\n${textoMaterial}`,
    };

    if (!token) {
      navigate("/login");
      return;
    }

    setCarregando(true);
    setResultado(null);

    try {
      const res = await fetch(`${API}/ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompts[tipoAcao] }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || `Erro HTTP ${res.status}`;
        if (res.status === 401) {
          setErro("Chave inválida ou expirada. Gere uma nova em console.groq.com");
        } else {
          setErro("Erro da API Groq: " + msg);
        }
        return;
      }

      const textoIA = data?.choices?.[0]?.message?.content;
      if (!textoIA) {
        setErro("Resposta inesperada da API. Tente novamente.");
        return;
      }

      setResultado({ titulo: tituloContainer, html: renderMd(textoIA) });
    } catch (err) {
      setErro("Erro de rede ao contatar a API Groq. Verifique sua conexão.");
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  if (!token) return null;

  return (
    <>
      <Navbar />
      <div className="main-container">
        <header>
          <h1>Gerador de Conteúdo com IA</h1>
          <p>Crie resumos práticos ou roteiros de estudo eficientes a partir dos seus materiais.</p>
        </header>

        <div
          className={`upload-box${dragOver ? " drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="upload-icon">📁</span>
          <p>{uploadStatus}</p>
          <span>Suporta arquivos de texto e PDF</span>
          {arquivo && (
            <span className="file-badge">
              {arquivo.name.split(".").pop().toUpperCase()} — {(arquivo.size / 1024).toFixed(1)} KB
            </span>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.pdf"
            style={{ display: "none" }}
            onChange={handleSelecionarArquivo}
          />
        </div>

        {erro && <div className="aviso-erro">⚠️ {erro}</div>}

        <div className="text-zone">
          <label htmlFor="textoDigitado">Ou digite/cole seu texto aqui:</label>
          <textarea
            id="textoDigitado"
            rows={6}
            placeholder="Insira o texto que deseja que a IA processe..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="actions">
          <button className="btn-primary" disabled={carregando} onClick={() => chamarIA("resumo", "📋 Resumo Gerado")}>
            📋 Gerar Resumo
          </button>
          <button className="btn-secondary" disabled={carregando} onClick={() => chamarIA("roteiro", "🗺️ Roteiro de Estudo")}>
            🗺️ Criar Roteiro de Estudo
          </button>
        </div>

        {!resultado && !carregando && (
          <div className="result-placeholder">Seu material gerado aparecerá aqui...</div>
        )}

        {carregando && <div className="spinner" style={{ display: "block" }} />}

        {resultado && (
          <div className="result-card" style={{ display: "block" }}>
            <h2>{resultado.titulo}</h2>
            <div
              ref={resultadoRef}
              className="result-text"
              dangerouslySetInnerHTML={{ __html: resultado.html }}
            />
          </div>
        )}
      </div>
    </>
  );
}
