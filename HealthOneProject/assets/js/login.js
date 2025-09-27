
    function handlePatientChoice(choice) {
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('appointmentModal'));
      modal.hide();
      
      // Aqui você pode adicionar a lógica para cada escolha
      if (choice === 'existing') {
        // Lógica para pacientes existentes
        alert('Redirecionando para área do paciente...');
        // window.location.href = 'forms/appointment.php'; // ou outra página
      } else if (choice === 'new') {
        // Lógica para novos pacientes
        window.location.href = 'cadastro.html';
      }
    }

    function handlePatientOption(option) {
      // Fecha o modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('patientModal'));
      modal.hide();
      
      // Redireciona para a página correspondente
      if (option === 'login') {
        window.location.href = 'Lista-agendamento/dash-pacientes.html';
      } else if (option === 'cadastro') {
        window.location.href = 'cadastro.html';
      }
    }

    // Adiciona evento para o formulário de login médico
    document.addEventListener('DOMContentLoaded', function() {
      const doctorLoginForm = document.getElementById('doctorLoginForm');
      if (doctorLoginForm) {
        doctorLoginForm.addEventListener('submit', function(event) {
          event.preventDefault();
          
          // Aqui você pode adicionar validação dos dados
          // Por enquanto, apenas redireciona para a página de laudos
          window.location.href = 'medico/tabela-pacientes/dashboard.html';
        });
      }
    });
// assets/js/login.js (ou onde estiver a lógica do seu modal)
// assets/js/auth.js
// váriaveis básicas
// Este código ficaria no seu script de login (ex: auth.js)

// --- Suas variáveis e funções request/api que você já tem ---
const BASE_URL = "https://yuanqfswhberkoevtmfr.supabase.co";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YW5xZnN3aGJlcmtvZXZ0bWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTQzNjksImV4cCI6MjA3MDUzMDM2OX0.g8Fm4XAvtX46zifBZnYVH4tVuQkqUH6Ia9CXQj4DztQ"; 

// ... (sua função request e o objeto api) ...


// --- Conectando ao formulário HTML ---
const loginForm = document.getElementById('secretariaLoginForm'); // Pega o formulário do seu HTML

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o recarregamento da página

    const emailInput = document.getElementById('emailSecretaria');
    const passwordInput = document.getElementById('senhaSecretaria');
    
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      // Chama a função de login com os dados do formulário
      const response = await fetch(`${BASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": API_KEY,
        },
        body: JSON.stringify({ email: email, password: password }),
      });
      
      const data = await response.json();

      if (data.access_token) {
        console.log("Login bem-sucedido! Redirecionando...");
        localStorage.setItem("token", data.access_token);
        
        // Redireciona para a tela correta
        window.location.href = '../Secretaria/dash-secretaria.html';
      } else {
        // Mostra o erro para o usuário
        throw new Error(data.error_description || "Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      // Mostre a mensagem de erro no seu HTML
      const errorMessageDiv = document.getElementById('secretariaError');
      if(errorMessageDiv) {
        errorMessageDiv.textContent = error.message;
        errorMessageDiv.style.display = 'block';
      }
    }
  });
}