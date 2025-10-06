// Garante que o script só rode depois que o HTML da página estiver pronto.
document.addEventListener('DOMContentLoaded', () => {

  const consultasBody = document.getElementById('consultasBody');
  const note = document.getElementById('note');

  /**
   * Carrega as consultas do localStorage e as exibe na tabela.
   */
  function carregarConsultas() {
    // 1. Lê os dados salvos no localStorage na chave 'healthone_consultas'
    const consultas = JSON.parse(localStorage.getItem('healthone_consultas') || '[]');

    // 2. Verifica se existem consultas salvas
    if (consultas.length === 0) {
      consultasBody.innerHTML = ''; // Limpa a tabela
      note.textContent = 'Nenhuma consulta agendada.';
      note.style.display = 'block';
      return; // Para a execução da função
    }

    // Esconde a mensagem "Carregando..."
    note.style.display = 'none';

    // 3. Cria as linhas da tabela (<tr>) para cada consulta encontrada
    consultasBody.innerHTML = consultas.map(consulta => {
      // Para os campos que não salvamos (como CPF, Telefone), colocamos um traço.
      // A lógica para buscar esses dados seria mais complexa, envolvendo o ID do paciente.
      const pacienteNome = consulta.pacienteNome || 'Paciente Padrão';
      const medicoNome = consulta.medicoNome || 'Médico não informado';
      const dataHora = consulta.dataHora || '-';

      return `
        <tr class="row">
          <td>-</td>
          <td>${pacienteNome}</td>
          <td>-</td>
          <td>${medicoNome}</td>
          <td>${dataHora}</td>
        </tr>
      `;
    }).join('');
  }

  // --- INICIALIZAÇÃO E EVENTOS ---

  // 1. Chama a função principal para carregar os dados assim que a página abre
  carregarConsultas();

  // 2. Bônus: Adiciona um "escutador" que atualiza a tabela automaticamente
  // se uma consulta for marcada em outra aba do navegador.
  window.addEventListener('storage', (event) => {
    if (event.key === 'healthone_consultas') {
      carregarConsultas();
    }
  });

});



