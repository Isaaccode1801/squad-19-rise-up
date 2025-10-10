// 1. IMPORTAÇÕES (devem estar no topo do arquivo, fora de qualquer bloco)
import { createLaudo, listPacientes, listarMedicos } from './pacientesService.js';

// 2. CÓDIGO UNIFICADO DENTRO DO DOMContentLoaded
// Garante que todo o código só rode depois que o HTML da página estiver pronto.
document.addEventListener('DOMContentLoaded', () => {

  // --- SELETORES GERAIS DO FORMULÁRIO ---
  const form = document.getElementById('form-novo-laudo');
  const selectPaciente = document.getElementById('paciente-id');
  const selectMedico = document.getElementById('solicitante');
  const btnCancelar = document.querySelector('.btn-cancelar');

  // --- SELETORES DA IA ---
  const btnToggleIA = document.getElementById('btn-toggle-ia');
  const btnGravarIA = document.getElementById('btn-gravar-ia');
  const btnResumirIA = document.getElementById('btn-resumir-ia');
  const laudoConteudoEditor = document.getElementById('laudo-conteudo');
  const toggleIcon = btnToggleIA.querySelector('i');

  // --- FUNÇÕES AUXILIARES ---
  function execCmd(command) { document.execCommand(command, false, null); }
  function preencherHoras() {
    const selectHora = document.getElementById("hora");
    if (!selectHora) return;
    for (let h = 8; h <= 22; h++) {
      ["00","30"].forEach(min => {
        if(h === 22 && min === "30") return;
        const o = new Option(`${String(h).padStart(2,"0")}:${min}`);
        selectHora.add(o);
      });
    }
  }
  function combinarDataEHora(data, hora) { return data && hora ? `${data}T${hora}:00Z` : null; }

  // --- LÓGICA DO FORMULÁRIO ---
  async function popularMedico() {
    try {
      const medicos = await listarMedicos(); // Note que mudei 'medico' para 'medicos' (plural)

      selectMedico.innerHTML = '<option value="">Selecione um médico</option>';
      medicos.forEach(med => {
        const option = new Option(med.full_name, med.id);
        selectMedico.add(option);
      });
    } catch (error) {
      console.error("Falha ao carregar lista de médicos:", error);
      selectMedico.innerHTML = '<option value="">Erro ao carregar médicos</option>';
    }
  }

  async function popularPacientes() {
    try {
      const pacientes = await listPacientes();
      
      selectPaciente.innerHTML = '<option value="">Selecione um paciente</option>'; 
      pacientes.forEach(paciente => {
        const option = new Option(paciente.full_name, paciente.id);
        selectPaciente.add(option);
      });

    } catch (error) {
      console.error("Falha ao carregar lista de pacientes:", error);
      selectPaciente.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
    }
  }

  async function salvarLaudo(event) {
    event.preventDefault();
    const btnSalvar = document.querySelector('.btn-salvar');
    const dadosDoLaudo = {
      patient_id: document.getElementById('paciente-id').value,
      exam: document.getElementById('exame').value,
      requested_by: document.getElementById('solicitante')?.value || null,
      content_html: document.getElementById('laudo-conteudo').innerHTML,
      status: document.getElementById('laudo-status').value,
      hide_signature: !document.getElementById('assinatura').checked,
      due_at: combinarDataEHora(document.getElementById('prazo').value, document.getElementById('hora').value),
      order_number: `REL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    };

    if (!dadosDoLaudo.patient_id || !dadosDoLaudo.exam) {
      alert("Paciente e Exame são obrigatórios!");
      return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
      await createLaudo(dadosDoLaudo);
      alert("Laudo salvo com sucesso!");
      window.location.href = 'Laudo.html';
    } catch (error) {
      console.error("Erro ao salvar o laudo:", error);
      alert(`Falha ao criar o laudo: ${error.message}`);
      btnSalvar.disabled = false;
      btnSalvar.textContent = 'Salvar Laudo';
    }
  }
    form.addEventListener('submit', salvarLaudo);
  btnCancelar.addEventListener('click', () => {
  if (confirm("Tem certeza que deseja cancelar e voltar para a lista de laudos?")) {
    window.location.href = 'Laudo.html'; // ❗️ Verifique se o nome do arquivo está correto
  }
});
  
  // --- LÓGICA DO ASSISTENTE DE IA ---
  // Acessa a chave do config.js (garanta que o config.js seja carregado antes deste script)
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
  let isMenuIAVisible = false;
  let isRecording = false;
  let recognition;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      btnGravarIA.innerHTML = '<i class="fa-solid fa-stop"></i> <span>Parar Gravação</span>';
      btnGravarIA.classList.add('gravando');
      btnResumirIA.disabled = true;
    };

    recognition.onend = () => {
      isRecording = false;
      btnGravarIA.innerHTML = '<i class="fa-solid fa-microphone"></i> <span>Iniciar Gravação</span>';
      btnGravarIA.classList.remove('gravando');
      if (laudoConteudoEditor.textContent.trim().length > 10) {
          btnResumirIA.disabled = false;
      }
    };

    recognition.onresult = (event) => {
      let final_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      if (final_transcript) {
        laudoConteudoEditor.innerHTML += final_transcript + ' ';
        btnResumirIA.disabled = false;
      }
    };
  } else {
    alert("Seu navegador não suporta o reconhecimento de voz. Tente usar o Google Chrome.");
  }

  async function gerarResumoComIA() {
    const transcricao = laudoConteudoEditor.innerHTML;
    if (!transcricao || transcricao.trim().length < 20) {
        alert("A transcrição é muito curta para gerar um resumo.");
        return;
    }
    
    if (typeof GEMINI_API_KEY === 'undefined' || !GEMINI_API_KEY || GEMINI_API_KEY === "SUA_CHAVE_DE_API_AQUI") {
        alert("Chave da API do Gemini não configurada no config.js");
        return;
    }

    btnResumirIA.disabled = true;
    btnResumirIA.innerHTML = '<div class="spinner"></div> <span>Resumindo...</span>';
    
    const systemPrompt = `Você é um assistente médico. Analise a transcrição de uma consulta e estruture-a em formato de prontuário (anamnese) com os seguintes tópicos em negrito: **Queixa Principal (QP)**, **História da Doença Atual (HDA)**, **Histórico Médico Pregresso (HMP)**, **Histórico Familiar (HF)** e **Hábitos de Vida (HV)**.Após a anamnese, adicione uma nova secção em negrito chamada **Plano Sugerido**. Nesta secção, com base nas informações recolhidas, sugira de forma concisa possíveis próximos passos, exames complementares ou linhas de tratamento para a consideração do profissional de saúde. Inicie esta secção com o aviso: *(Sugestão gerada por IA para avaliação do profissional. Não é um diagnóstico final.)*.
 A transcrição a ser analisada é a seguinte:`;
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: transcricao }] }],
    };

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API respondeu com status: ${response.status}`);
      
      const result = await response.json();
      const textoResumido = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textoResumido) {
        laudoConteudoEditor.innerHTML = textoResumido.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      } else {
        throw new Error("Resposta da IA inválida.");
      }
    } catch (error) {
      console.error("Erro ao chamar a API do Gemini:", error);
      laudoConteudoEditor.innerHTML += `<br><p style='color:red;'>Erro ao gerar resumo: ${error.message}</p>`;
    } finally {
      btnResumirIA.disabled = false;
      btnResumirIA.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Gerar Resumo</span>';
    }
  }
  
  // --- EVENT LISTENERS (Todos juntos) ---
  form.addEventListener('submit', salvarLaudo);
  btnCancelar.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja cancelar?")) {
      window.location.href = 'Laudo.html';
    }
  });

  // ✅ CORREÇÃO: Listeners do editor agora usam 'data-command'
  document.querySelectorAll('.editor-toolbar button[data-command]').forEach(button => {
    button.addEventListener('click', () => {
      execCmd(button.dataset.command);
    });
  });
  
  // Listeners da IA
  btnToggleIA.addEventListener('click', () => {
    isMenuIAVisible = !isMenuIAVisible;
    btnGravarIA.classList.toggle('visible', isMenuIAVisible);
    btnResumirIA.classList.toggle('visible', isMenuIAVisible);
    toggleIcon.classList.toggle('fa-robot');
    toggleIcon.classList.toggle('fa-xmark');
  });

  btnGravarIA.addEventListener('click', () => {
    if (!SpeechRecognition) return;
    if (isRecording) {
      recognition.stop();
    } else {
      laudoConteudoEditor.innerHTML = '';
      btnResumirIA.disabled = true;
      recognition.start();
    }
  });

  btnResumirIA.addEventListener('click', gerarResumoComIA);

  // --- INICIALIZAÇÃO DA PÁGINA ---
  preencherHoras();
  popularPacientes();
  popularMedico();
}); // Fim do DOMContentLoaded