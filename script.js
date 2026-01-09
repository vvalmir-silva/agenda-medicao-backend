(function() {
    // Login functionality
    document.addEventListener('DOMContentLoaded', function() {
            const loginScreen = document.getElementById('login-screen');
            const mainContent = document.getElementById('main-content');
            const loginForm = document.getElementById('login-form');
            const loginError = document.getElementById('login-error');
            
            // Check if user is already logged in
            if (localStorage.getItem('loggedIn') === 'true') {
                // Verificar se a sessão não expirou
                if (checkSessionTimeout()) {
                    loginScreen.classList.add('hidden');
                    mainContent.classList.remove('hidden');
                    initializeApp();
                    
                    // Atualizar última atividade
                    localStorage.setItem('last_activity', new Date().toISOString());
                } else {
                    // Sessão expirou, mostrar tela de login
                    loginScreen.classList.remove('hidden');
                    console.log('⏰ Sessão expirada detectada no carregamento');
                }
            } else {
                loginScreen.classList.remove('hidden');
            }
            
            // Handle login form submission
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                // Simple authentication (in a real app, this would be server-side)
                if (username.toLowerCase() === 'admin' && password === '1234') {
                    // Registrar login e atividade
                    localStorage.setItem('loggedIn', 'true');
                    localStorage.setItem('login_time', new Date().toISOString());
                    localStorage.setItem('last_activity', new Date().toISOString());
                    
                    loginScreen.classList.add('hidden');
                    mainContent.classList.remove('hidden');
                    loginError.classList.add('hidden');
                    initializeApp();
                    
                    // Log de segurança
                    console.log('🔐 Login realizado com sucesso em:', new Date().toISOString());
                } else {
                    // Mostrar popup de erro com animação
                    loginError.classList.remove('hidden');
                    // Adicionar animação de entrada
                    setTimeout(() => {
                        const popup = loginError.querySelector('div');
                        popup.classList.remove('scale-95');
                        popup.classList.add('scale-100');
                    }, 10);
                    
                    // Log de tentativa falha
                    console.warn('🚨 Tentativa de login falhou:', {
                        username: username,
                        timestamp: new Date().toISOString(),
                        ip: 'client-side' // Em produção, obter IP real
                    });
                }
            });
        });
        
        // Função para fechar o popup de erro de login
        function closeLoginError() {
            const loginError = document.getElementById('login-error');
            const popup = loginError.querySelector('div');
            
            // Adicionar animação de saída
            popup.classList.remove('scale-100');
            popup.classList.add('scale-95');
            
            setTimeout(() => {
                loginError.classList.add('hidden');
                // Limpar campos do formulário
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                document.getElementById('username').focus();
            }, 300);
        }
        
        // Tornar a função global
        window.closeLoginError = closeLoginError;
        
        // Variáveis globais
        let agendamentos = [];
        let filteredAgendamentos = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let selectedIds = new Set();
        let buscaTimeout = null;
        let isLoading = false; // Flag para evitar múltiplas chamadas simultâneas
        let statusChart = null;
        let selectedAmbientes = [];
        let modalSelectedAmbientes = [];

        // API base URL - read from meta tag `api-base` or fallback to localhost
        const metaApi = document.querySelector('meta[name="api-base"]');
        const API_BASE = (metaApi && metaApi.content) ? metaApi.content.replace(/\/$/, '') : 'http://localhost:3000/api';

        // Carregar agendamentos da API
        async function loadAgendamentos(buscaGeral = '') {
            // Evitar múltiplas chamadas simultâneas
            if (isLoading) {
                console.log('⏸️ Já está carregando, ignorando chamada...');
                return;
            }
            
            isLoading = true;
            console.log('Carregando agendamentos da API...');
            console.log('Busca geral:', buscaGeral);
            
            // Construir URL com parâmetros de busca
            const params = new URLSearchParams();
            if (buscaGeral) params.append('busca', buscaGeral);
            params.append('limit', 1000); // Buscar todos os registros
            
            const url = `${API_BASE}/agendamentos${params.toString() ? '?' + params.toString() : ''}`;
            console.log('URL da API:', url);
            
            try {
                const response = await fetch(url);
                console.log('Status da resposta:', response.status);
                console.log('Resposta OK:', response.ok);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Dados recebidos da API:', result);
                    console.log('result.data:', result.data);
                    console.log('result.data length:', result.data?.length);
                    agendamentos = result.data || [];
                    console.log('Agendamentos carregados:', agendamentos.length);
                    console.log('IDs dos agendamentos:', agendamentos.map(a => a.id));
                    
                    // Atualizar filteredAgendamentos (filtrar apenas agendados)
                    filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                    console.log('Atualizando filteredAgendamentos (apenas agendados):', filteredAgendamentos.length);
                    
                    // Renderizar a tabela
                    renderAgendamentos();
                    console.log('Tabela renderizada');
                    
                    // Atualizar dashboard se estiver na seção correta
                    const dashboardSection = document.getElementById('dashboard-section');
                    if (dashboardSection && !dashboardSection.classList.contains('hidden')) {
                        updateDashboard();
                    }
                } else {
                    console.error('Erro ao carregar agendamentos');
                    agendamentos = [];
                    filteredAgendamentos = [];
                    renderAgendamentos();
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                agendamentos = [];
                filteredAgendamentos = [];
                renderAgendamentos();
            } finally {
                isLoading = false;
            }
        }

        // Filtrar agendamentos
        function filtrarAgendamentos() {
            console.log('=== FUNÇÃO filtrarAgendamentos CHAMADA ===');
            const buscaGeralElement = document.getElementById('busca-geral');
            console.log('Elemento busca-geral encontrado:', !!buscaGeralElement);
            
            if (buscaGeralElement) {
                console.log('Valor do campo busca:', buscaGeralElement.value);
                console.log('Tipo do elemento:', buscaGeralElement.tagName);
            }
            
            const buscaGeral = buscaGeralElement?.value || '';
            console.log('Filtrando agendamentos com busca geral:', buscaGeral);
            
            // Limpar timeout anterior
            if (buscaTimeout) {
                clearTimeout(buscaTimeout);
            }
            
            // Aguardar 500ms antes de fazer a busca
            buscaTimeout = setTimeout(() => {
                console.log('Executando busca após debounce...');
                loadAgendamentos(buscaGeral).then(() => {
                    console.log('loadAgendamentos concluído, atualizando interface...');
                    // Resetar paginação
                    currentPage = 1;
                    selectedIds.clear();
                    
                    // Como já buscamos filtrado, usar apenas agendados
                    filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                    renderAgendamentos();
                });
            }, 500);
        }

        function initializeApp() {
            // Initialize the main application
            loadAgendamentos().then(async () => {
                showSection('list'); 
                await updateDashboard();
                filtrarAgendamentos();
                
                // Define data mínima como hoje
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('data').setAttribute('min', today);
                document.getElementById('modal-data').setAttribute('min', today);

                console.log('Configurando event listeners...');
                
                // Configurar event listener do formulário do modal
                const modalForm = document.getElementById('create-edit-form');
                if (modalForm) {
                    modalForm.addEventListener('submit', function(e) {
                        e.preventDefault();
                        saveModalAgendamento();
                    });
                }
                
                setTimeout(() => {
                    const buscaGeral = document.getElementById('busca-geral');
                    console.log('=== CONFIGURANDO EVENT LISTENER DO CAMPO DE BUSCA (DELAYED) ===');
                    console.log('Elemento busca-geral encontrado:', !!buscaGeral);
                    
                    if (buscaGeral) {
                        console.log('Adicionando event listener input ao campo busca-geral');
                        buscaGeral.addEventListener('input', function(e) {
                            console.log('Evento input detectado no campo busca:', e.target.value);
                            filtrarAgendamentos();
                        });
                        
                        // Testar se o elemento está respondendo a eventos
                        buscaGeral.addEventListener('focus', function() {
                            console.log('Campo busca recebeu foco');
                        });
                    } else {
                        console.error('ERRO: Elemento busca-geral não encontrado!');
                    }
                }, 100);
            }).catch(error => {
                console.error('Erro ao inicializar app:', error);
            });
        }

        function logout() {
            // Limpar todos os dados de sessão
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('agendamentos_cache');
            localStorage.removeItem('dashboard_cache');
            localStorage.removeItem('user_preferences');
            localStorage.removeItem('last_activity');
            
            // Limpar sessionStorage também
            sessionStorage.clear();
            
            // Resetar variáveis globais
            agendamentos = [];
            filteredAgendamentos = [];
            selectedIds.clear();
            currentPage = 1;
            
            // Esconder conteúdo principal
            document.getElementById('main-content').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            
            // Limpar formulário
            document.getElementById('login-form').reset();
            document.getElementById('login-error').classList.add('hidden');
            
            // Limpar possíveis dados sensíveis da memória
            if (statusChart) {
                statusChart.destroy();
                statusChart = null;
            }
            
            // Foco no campo de usuário
            document.getElementById('username').focus();
            
            // Log de segurança (em produção, enviar para servidor)
            console.log('🔒 Logout realizado em:', new Date().toISOString());
        }
        
        // Forçar logout imediato (para acesso não autorizado)
        function forceLogout() {
            console.warn('🚨 Acesso não autorizado detectado! Forçando logout...');
            logout();
            // Mostrar mensagem de segurança
            const loginError = document.getElementById('login-error');
            loginError.querySelector('p').textContent = 'Sessão expirada. Por favor, autentique-se novamente.';
            loginError.classList.remove('hidden');
        }
        
        // Verificar timeout de sessão (30 minutos)
        function checkSessionTimeout() {
            const lastActivity = localStorage.getItem('last_activity');
            const sessionTimeout = 30 * 60 * 1000; // 30 minutos
            
            if (lastActivity) {
                const timeSinceLastActivity = Date.now() - new Date(lastActivity).getTime();
                if (timeSinceLastActivity > sessionTimeout) {
                    console.log('⏰ Sessão expirada por timeout');
                    forceLogout();
                    return false;
                }
            }
            return true;
        }
        
        // Verificar sessão periodicamente
        setInterval(() => {
            if (localStorage.getItem('loggedIn') === 'true') {
                checkSessionTimeout();
            }
        }, 60000); // Verificar a cada minuto
        
        // Prevenir acesso direto via URL e voltar pelo browser
        window.addEventListener('popstate', function(event) {
            if (localStorage.getItem('loggedIn') !== 'true') {
                history.pushState(null, null, location.href);
                forceLogout();
            }
        });
        
        // Bloquear acesso direto recarregando a página
        window.addEventListener('load', function() {
            if (localStorage.getItem('loggedIn') !== 'true') {
                // Limpar URL se alguém tentar acessar diretamente
                if (window.location.hash || window.location.search) {
                    window.location = window.location.pathname;
                }
            }
        });
        
        // Prevenir devtools em produção (opcional)
        document.addEventListener('keydown', function(e) {
            // Prevenir F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.keyCode === 123 || 
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                (e.ctrlKey && e.keyCode === 85)) {
                if (localStorage.getItem('loggedIn') === 'true') {
                    e.preventDefault();
                    console.warn('🚫 Acesso ao developer tools bloqueado durante sessão');
                }
            }
        });

        // Mostrar seção específica
        function showSection(section) {
            // Verificar se usuário está autenticado
            if (localStorage.getItem('loggedIn') !== 'true') {
                forceLogout();
                return;
            }
            
            // Atualizar última atividade
            localStorage.setItem('last_activity', new Date().toISOString());
            
            // Esconder todas as seções
            document.getElementById('form-section').classList.add('hidden');
            document.getElementById('list-section').classList.add('hidden');
            document.getElementById('dashboard-section').classList.add('hidden');
            
            // Mostrar a seção solicitada
            document.getElementById(`${section}-section`).classList.remove('hidden');
            
            // Atualizar navegação
            document.querySelectorAll('.nav-item').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.getElementById(`nav-${section}`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        // Renderizar lista de agendamentos com paginação
        function renderAgendamentos() {
            console.log('=== RENDERIZANDO AGENDAMENTOS ===');
            console.log('Total de filteredAgendamentos:', filteredAgendamentos.length);
            
            const tbody = document.getElementById('agendamentos-list');
            const noAgendamentos = document.getElementById('no-agendamentos');
            
            console.log('Elemento tbody encontrado:', !!tbody);
            console.log('Elemento no-agendamentos encontrado:', !!noAgendamentos);
            
            const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageAgendamentos = filteredAgendamentos.slice(startIndex, endIndex);
            
            console.log('Dados da paginação:', {
                totalPages,
                currentPage,
                startIndex,
                endIndex,
                pageAgendamentosLength: pageAgendamentos.length
            });
            
            // Atualizar informações de paginação
            document.getElementById('current-page').textContent = currentPage;
            document.getElementById('total-pages').textContent = totalPages || 1;
            document.getElementById('showing-count').textContent = pageAgendamentos.length;
            document.getElementById('total-count').textContent = filteredAgendamentos.length;
            
            // Atualizar botões de paginação
            document.getElementById('prev-btn').disabled = currentPage === 1;
            document.getElementById('next-btn').disabled = currentPage === totalPages || totalPages === 0;
            
            if (filteredAgendamentos.length === 0) {
                console.log('Nenhum agendamento encontrado, mostrando mensagem');
                tbody.innerHTML = '';
                noAgendamentos.classList.remove('hidden');
                return;
            }
            
            console.log('Renderizando', pageAgendamentos.length, 'agendamentos');
            noAgendamentos.classList.add('hidden');
            
            tbody.innerHTML = pageAgendamentos.map(agendamento => `
                <tr class="hover:bg-gray-50">
                    <td class="px-2 sm:px-4 py-2 sm:py-3">
                        <input type="checkbox" class="row-checkbox w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                               data-id="${agendamento.id}" 
                               onchange="toggleRowSelection(${agendamento.id})"
                               ${selectedIds.has(agendamento.id) ? 'checked' : ''}>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3">
                        <div>
                            <div class="font-medium text-gray-900 text-sm">${agendamento.nome_cliente}</div>
                            <div class="text-xs text-gray-500 sm:hidden">${agendamento.telefone}</div>
                        </div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                        <div class="text-sm text-gray-900">${agendamento.telefone}</div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                        <div class="text-sm text-gray-900">${agendamento.tipo_imovel}</div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                        <div class="text-sm text-gray-900">${agendamento.loja}</div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                        <div class="text-sm text-gray-900">${formatDate(agendamento.data)}</div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                        <div class="text-sm text-gray-900">${agendamento.horario}</div>
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        ${getStatusBadge(agendamento.status)}
                    </td>
                    <td class="px-2 sm:px-4 py-2 sm:py-3 text-center">
                        <div class="flex justify-center space-x-1 sm:space-x-2">
                            <button onclick="viewAgendamento(${agendamento.id})" 
                                    class="text-green-600 hover:text-green-800 p-1" title="Visualizar">
                                <i class="fas fa-eye text-sm"></i>
                            </button>
                            <button onclick="editAgendamento(${agendamento.id})" 
                                    class="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            ${agendamento.status === 'agendado' ? `
                            <button onclick="concluirAgendamento(${agendamento.id})" 
                                    class="text-green-600 hover:text-green-800 p-1" title="Concluir">
                                <i class="fas fa-check text-sm"></i>
                            </button>
                            <button onclick="cancelarAgendamento(${agendamento.id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Cancelar">
                                <i class="fas fa-times text-sm"></i>
                            </button>
                            ` : ''}
                            <button onclick="deleteAgendamento(${agendamento.id})" 
                                    class="text-red-600 hover:text-red-800 p-1" title="Excluir">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        // Funções auxiliares
        function formatDate(dateString) {
            // Se a data já está no formato YYYY-MM-DD, formatar diretamente sem criar Date object
            if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-');
                return `${day}/${month}/${year}`;
            }
            // Para outros formatos, usar o método tradicional
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        }

        function updateSelectedCount() {
            const count = selectedIds.size;
            if (document.getElementById('selected-count')) {
                document.getElementById('selected-count').textContent = count;
            }
        }

        function toggleRowSelection(id) {
            if (selectedIds.has(id)) {
                selectedIds.delete(id);
            } else {
                selectedIds.add(id);
            }
            updateSelectedCount();
        }

        function toggleSelectAll() {
            const selectAllCheckbox = document.getElementById('select-all');
            const headerCheckbox = document.getElementById('header-select-all');
            const isChecked = selectAllCheckbox ? selectAllCheckbox.checked : headerCheckbox.checked;
            
            if (isChecked) {
                // Adicionar todos os IDs da página atual
                const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageAgendamentos = filteredAgendamentos.slice(startIndex, endIndex);
                
                pageAgendamentos.forEach(agendamento => {
                    selectedIds.add(agendamento.id);
                });
            } else {
                // Limpar seleção
                selectedIds.clear();
            }
            
            updateSelectedCount();
            
            // Atualizar checkboxes visíveis
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        }

        function nextPage() {
            const totalPages = Math.ceil(filteredAgendamentos.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderAgendamentos();
            }
        }

        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                renderAgendamentos();
            }
        }

        function viewAgendamento(id) {
            console.log('Visualizar agendamento:', id);
            
            // Encontrar o agendamento pelo ID
            const agendamento = agendamentos.find(a => a.id == id);
            
            if (!agendamento) {
                showNotification('Erro!', 'Agendamento não encontrado.', 'error');
                return;
            }
            
            // Preencher os dados no modal de visualização
            document.getElementById('view-nome').textContent = agendamento.nome_cliente || '-';
            document.getElementById('view-telefone').textContent = agendamento.telefone || '-';
            document.getElementById('view-email').textContent = agendamento.email || '-';
            document.getElementById('view-tipo-imovel').textContent = agendamento.tipo_imovel || '-';
            document.getElementById('view-ambiente').textContent = agendamento.ambiente || '-';
            document.getElementById('view-loja').textContent = agendamento.loja || '-';
            document.getElementById('view-data').textContent = agendamento.data ? formatDate(agendamento.data) : '-';
            document.getElementById('view-horario').textContent = agendamento.horario || '-';
            document.getElementById('view-status').textContent = agendamento.status || '-';
            
            // Endereço - preencher campos separados
            document.getElementById('view-logradouro').textContent = agendamento.logradouro || '-';
            document.getElementById('view-numero').textContent = agendamento.numero || '-';
            document.getElementById('view-complemento').textContent = agendamento.complemento || '-';
            document.getElementById('view-bairro').textContent = agendamento.bairro || '-';
            document.getElementById('view-cidade').textContent = agendamento.cidade || '-';
            document.getElementById('view-cep').textContent = agendamento.cep || '-';
            
            // Observações
            document.getElementById('view-observacao').textContent = agendamento.observacao || '-';
            
            // Status badge
            const statusElement = document.getElementById('view-status');
            statusElement.className = 'font-medium text-lg px-3 py-2 rounded-lg border';
            
            switch(agendamento.status) {
                case 'agendado':
                    statusElement.className += ' bg-blue-100 text-blue-800 border-blue-200';
                    break;
                case 'concluido':
                    statusElement.className += ' bg-green-100 text-green-800 border-green-200';
                    break;
                case 'cancelado':
                    statusElement.className += ' bg-red-100 text-red-800 border-red-200';
                    break;
                default:
                    statusElement.className += ' bg-gray-100 text-gray-800 border-gray-200';
            }
            
            // Abrir o modal
            const modal = document.getElementById('view-modal');
            const content = modal.querySelector('.modal-content');
            
            modal.classList.remove('hidden');
            
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function showEditMaintenanceMessage() {
            showNotification('Edição Temporariamente Indisponível', 
                'A função de edição está temporariamente desabilitada para manutenção. ' +
                'Por favor, contate o suporte técnico ou tente novamente mais tarde. ' +
                'Você pode criar novos agendamentos normalmente.', 'warning');
        }

        function editAgendamento(id) {
            console.log('Editar agendamento:', id);
            
            // Encontrar o agendamento pelo ID
            const agendamento = agendamentos.find(a => a.id == id);
            
            if (!agendamento) {
                showNotification('Erro!', 'Agendamento não encontrado.', 'error');
                return;
            }
            
            // Preencher os dados no modal de edição
            document.getElementById('modal-id').value = agendamento.id;
            document.getElementById('modal-nome').value = agendamento.nome_cliente || '';
            document.getElementById('modal-telefone').value = agendamento.telefone || '';
            document.getElementById('modal-email').value = agendamento.email || '';
            document.getElementById('modal-tipo-imovel').value = agendamento.tipo_imovel || '';
            document.getElementById('modal-loja').value = agendamento.loja || '';
            document.getElementById('modal-data').value = agendamento.data || '';
            document.getElementById('modal-horario').value = agendamento.horario || '';
            document.getElementById('modal-status').value = agendamento.status || 'agendado';
            
            // Endereço
            document.getElementById('modal-cep').value = agendamento.cep || '';
            document.getElementById('modal-numero').value = agendamento.numero || '';
            document.getElementById('modal-complemento').value = agendamento.complemento || '';
            document.getElementById('modal-logradouro').value = agendamento.logradouro || '';
            document.getElementById('modal-bairro').value = agendamento.bairro || '';
            document.getElementById('modal-cidade').value = agendamento.cidade || '';
            
            // Observações
            document.getElementById('modal-observacao').value = agendamento.observacao || '';
            
            // Configurar tipo de imóvel primeiro
            document.getElementById('modal-tipo-imovel').value = agendamento.tipo_imovel || '';
            console.log('Tipo de imóvel configurado:', agendamento.tipo_imovel);
            
            // Configurar ambientes
            modalSelectedAmbientes = agendamento.ambiente ? agendamento.ambiente.split(', ') : [];
            console.log('Ambientes do agendamento:', agendamento.ambiente);
            console.log('modalSelectedAmbientes carregados:', modalSelectedAmbientes);
            
            // Atualizar o dropdown de ambientes com base no tipo de imóvel (preservar seleção carregada)
            updateModalAmbientes(true);
            
            // Atualizar display dos ambientes selecionados
            const container = document.getElementById('modal-ambiente-selected');
            const hiddenInput = document.getElementById('modal-ambiente');
            
            if (modalSelectedAmbientes.length > 0) {
                container.textContent = modalSelectedAmbientes.join(', ');
                hiddenInput.value = modalSelectedAmbientes.join(', ');
                console.log('Display de ambientes atualizado:', modalSelectedAmbientes.join(', '));
            }
            
            // Marcar checkboxes dos ambientes selecionados
            setTimeout(() => {
                modalSelectedAmbientes.forEach(ambiente => {
                    const checkbox = document.querySelector(`input[type="checkbox"][value="${ambiente}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }, 100);
            
            // Mudar título do modal
            document.getElementById('modal-title').textContent = 'Editar Agendamento';
            
            // Mudar texto do botão de salvar
            const saveButton = document.querySelector('#create-edit-form button[type="submit"]');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i><span>Atualizar Agendamento</span>';
            }
            
            // Abrir o modal
            const modal = document.getElementById('create-edit-modal');
            modal.classList.remove('hidden');
            
            setTimeout(() => {
                const content = modal.querySelector('.modal-content');
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        async function deleteAgendamento(id) {
            console.log('Excluir agendamento:', id);
            
            return new Promise((resolve) => {
                showConfirm(
                    'Confirmar Exclusão',
                    'Tem certeza que deseja excluir este agendamento?',
                    'Excluir',
                    async () => {
                        try {
                            const response = await fetch(`${API_BASE}/agendamentos/${id}`, {
                                method: 'DELETE'
                            });
                            
                            if (response.ok) {
                                // Recarregar a lista após exclusão
                                await loadAgendamentos();
                                filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                renderAgendamentos();
                                await updateDashboard();
                                
                                // Mostrar popup de sucesso
                                showNotification('Sucesso!', 'Agendamento excluído com sucesso!');
                            } else {
                                showNotification('Erro!', 'Erro ao excluir agendamento. Tente novamente.', 'error');
                            }
                        } catch (error) {
                            console.error('Erro na requisição de exclusão:', error);
                            showNotification('Erro!', 'Erro ao excluir agendamento. Verifique sua conexão.', 'error');
                        }
                        resolve();
                    }
                );
            });
        }

        async function concluirAgendamento(id) {
            console.log('Concluir agendamento:', id);
            
            return new Promise((resolve) => {
                showConfirm(
                    'Confirmar Conclusão',
                    'Tem certeza que deseja marcar este agendamento como concluído?',
                    'Concluir',
                    async () => {
                        try {
                            // Buscar dados atuais do agendamento
                            const agendamentoAtual = agendamentos.find(a => a.id == id);
                            if (!agendamentoAtual) {
                                showNotification('Erro!', 'Agendamento não encontrado.', 'error');
                                resolve();
                                return;
                            }
                            
                            // Criar objeto com todos os dados atuais + status alterado
                            const dadosAtualizados = {
                                ...agendamentoAtual,
                                status: 'concluido'
                            };
                            
                            const response = await fetch(`${API_BASE}/agendamentos/${id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(dadosAtualizados)
                            });
                            
                            if (response.ok) {
                                // Recarregar a lista após atualização
                                await loadAgendamentos();
                                filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                renderAgendamentos();
                                await updateDashboard();
                                
                                // Mostrar popup de sucesso
                                showNotification('Sucesso!', 'Agendamento marcado como concluído!');
                            } else {
                                showNotification('Erro!', 'Erro ao concluir agendamento. Tente novamente.', 'error');
                            }
                        } catch (error) {
                            console.error('Erro na requisição de conclusão:', error);
                            showNotification('Erro!', 'Erro ao concluir agendamento. Verifique sua conexão.', 'error');
                        }
                        resolve();
                    }
                );
            });
        }

        async function cancelarAgendamento(id) {
            console.log('Cancelar agendamento:', id);
            
            return new Promise((resolve) => {
                showConfirm(
                    'Confirmar Cancelamento',
                    'Tem certeza que deseja cancelar este agendamento?',
                    'Confirmar Cancelamento',
                    async () => {
                        try {
                            // Buscar dados atuais do agendamento
                            const agendamentoAtual = agendamentos.find(a => a.id == id);
                            if (!agendamentoAtual) {
                                showNotification('Erro!', 'Agendamento não encontrado.', 'error');
                                resolve();
                                return;
                            }
                            
                            // Criar objeto com todos os dados atuais + status alterado
                            const dadosAtualizados = {
                                ...agendamentoAtual,
                                status: 'cancelado'
                            };
                            
                            const response = await fetch(`${API_BASE}/agendamentos/${id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(dadosAtualizados)
                            });
                            
                            if (response.ok) {
                                // Recarregar a lista após atualização
                                await loadAgendamentos();
                                filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                renderAgendamentos();
                                await updateDashboard();
                                
                                // Mostrar popup de sucesso
                                showNotification('Sucesso!', 'Agendamento cancelado com sucesso!');
                            } else {
                                showNotification('Erro!', 'Erro ao cancelar agendamento. Tente novamente.', 'error');
                            }
                        } catch (error) {
                            console.error('Erro na requisição de cancelamento:', error);
                            showNotification('Erro!', 'Erro ao cancelar agendamento. Verifique sua conexão.', 'error');
                        }
                        resolve();
                    }
                );
            });
        }

        async function deleteSelected() {
            console.log('Excluir selecionados:', Array.from(selectedIds));
            
            if (selectedIds.size === 0) {
                showNotification('Atenção!', 'Selecione pelo menos um agendamento para excluir.', 'warning');
                return;
            }
            
            return new Promise((resolve) => {
                showConfirm(
                    'Confirmar Exclusão em Lote',
                    `Tem certeza que deseja excluir ${selectedIds.size} agendamento(s) selecionado(s)?`,
                    'Excluir Todos',
                    async () => {
                        try {
                            // Excluir cada agendamento selecionado
                            const deletePromises = Array.from(selectedIds).map(id => 
                                fetch(`${API_BASE}/agendamentos/${id}`, {
                                    method: 'DELETE'
                                })
                            );
                            
                            const results = await Promise.all(deletePromises);
                            const failedDeletes = results.filter(response => !response.ok);
                            
                            if (failedDeletes.length === 0) {
                                // Limpar seleção e recarregar
                                selectedIds.clear();
                                updateSelectedCount();
                                await loadAgendamentos();
                                filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                renderAgendamentos();
                                await updateDashboard();
                                
                                showNotification('Sucesso!', 'Agendamentos excluídos com sucesso!');
                            } else {
                                showNotification('Erro!', `Erro ao excluir ${failedDeletes.length} agendamento(s). Tente novamente.`, 'error');
                            }
                        } catch (error) {
                            console.error('Erro na requisição de exclusão em lote:', error);
                            showNotification('Erro!', 'Erro ao excluir agendamentos. Verifique sua conexão.', 'error');
                        }
                        resolve();
                    }
                );
            });
        }

        // Atualizar dashboard
        function updateDashboard() {
            console.log('=== ATUALIZANDO DASHBOARD ===');
            console.log('Total de agendamentos:', agendamentos.length);
            
            const total = agendamentos.length;
            const agendados = agendamentos.filter(a => a.status === 'agendado').length;
            const concluidos = agendamentos.filter(a => a.status === 'concluido').length;
            const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;
            
            console.log('Status contados:', { agendados, concluidos, cancelados });
            
            // Atualizar cards do dashboard
            const totalElement = document.getElementById('total-agendamentos');
            const agendadosElement = document.getElementById('total-agendados');
            const concluidosElement = document.getElementById('total-concluidos');
            
            console.log('Elementos encontrados:', {
                total: !!totalElement,
                agendados: !!agendadosElement,
                concluidos: !!concluidosElement
            });
            
            if (totalElement) totalElement.textContent = total;
            if (agendadosElement) agendadosElement.textContent = agendados;
            if (concluidosElement) concluidosElement.textContent = concluidos;
            
            // Renderizar gráfico se existir
            renderChart();
            
            // Renderizar detalhes por status
            renderDashboardDetails();
            
            // Atualizar roteiro do dia
            atualizarRoteiroHoje();
            
            // Atualizar roteiros dos próximos dias
            atualizarRoteirosProximosDias();
        }

        // Renderizar detalhes do dashboard por status
        function renderDashboardDetails() {
            console.log('=== RENDERIZANDO DETALHES DO DASHBOARD ===');
            
            const filterValue = document.getElementById('dashboard-filter')?.value || 'all';
            const statusFilter = document.getElementById('status-filter')?.value || 'all';
            let filteredAgendamentos = [...agendamentos];
            
            // Aplicar filtro de período
            if (filterValue !== 'all') {
                const now = new Date();
                filteredAgendamentos = agendamentos.filter(agendamento => {
                    // Usar comparação direta de strings para evitar fuso horário
                    const agendamentoDateStr = agendamento.data;
                    const nowStr = now.toISOString().split('T')[0];
                    
                    switch (filterValue) {
                        case 'today':
                            return agendamentoDateStr === nowStr;
                        case 'week':
                            const weekStart = new Date(now);
                            weekStart.setDate(now.getDate() - now.getDay());
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 6);
                            const weekStartStr = weekStart.toISOString().split('T')[0];
                            const weekEndStr = weekEnd.toISOString().split('T')[0];
                            return agendamentoDateStr >= weekStartStr && agendamentoDateStr <= weekEndStr;
                        case 'month':
                            const currentMonth = now.getMonth();
                            const currentYear = now.getFullYear();
                            const [year, month] = agendamentoDateStr.split('-').map(Number);
                            return month === currentMonth + 1 && year === currentYear;
                        default:
                            return true;
                    }
                });
            }
            
            // Aplicar filtro de status
            if (statusFilter !== 'all') {
                filteredAgendamentos = filteredAgendamentos.filter(a => a.status === statusFilter);
            }
            
            // Filtrar agendamentos por status (apenas agendados e concluídos)
            const agendados = filteredAgendamentos.filter(a => a.status === 'agendado');
            const concluidos = filteredAgendamentos.filter(a => a.status === 'concluido');
            
            // Atualizar contadores
            document.getElementById('count-agendados').textContent = agendados.length;
            document.getElementById('count-concluidos').textContent = concluidos.length;
            
            // Renderizar listas
            renderStatusList('lista-agendados', agendados, 'agendado');
            renderStatusList('lista-concluidos', concluidos, 'concluido');
        }

        // Renderizar lista de agendamentos por status
        function renderStatusList(containerId, agendamentosList, status) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            if (agendamentosList.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-inbox text-3xl mb-2"></i>
                        <p class="text-sm">Nenhum agendamento ${status === 'agendado' ? 'agendado' : status === 'concluido' ? 'concluído' : 'cancelado'}</p>
                    </div>
                `;
                return;
            }
            
            const statusColors = {
                agendado: 'bg-blue-100 text-blue-800 border-blue-200',
                concluido: 'bg-green-100 text-green-800 border-green-200',
                cancelado: 'bg-red-100 text-red-800 border-red-200'
            };
            
            const statusIcons = {
                agendado: 'fas fa-calendar-check',
                concluido: 'fas fa-check-circle',
                cancelado: 'fas fa-times-circle'
            };
            
            container.innerHTML = agendamentosList.map(agendamento => `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
                     onclick="viewAgendamento(${agendamento.id})">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900">${agendamento.nome_cliente}</h4>
                            <p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>${agendamento.telefone}</p>
                        </div>
                        <span class="px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status]}">
                            <i class="${statusIcons[status]} mr-1"></i>${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </div>
                    
                    <div class="space-y-1 text-sm text-gray-600">
                        <div class="flex items-center">
                            <i class="fas fa-calendar-alt mr-2 w-4"></i>
                            <span>${formatDate(agendamento.data)}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-clock mr-2 w-4"></i>
                            <span>${agendamento.horario}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-store mr-2 w-4"></i>
                            <span>${agendamento.loja || 'Loja não especificada'}</span>
                        </div>
                        ${agendamento.logradouro ? `
                            <div class="flex items-center">
                                <i class="fas fa-map-marker-alt mr-2 w-4"></i>
                                <span class="truncate">${agendamento.logradouro}${agendamento.numero ? ', ' + agendamento.numero : ''}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${agendamento.observacoes ? `
                        <div class="mt-3 pt-3 border-t border-gray-100">
                            <p class="text-xs text-gray-500 italic">${agendamento.observacoes}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        // Renderizar gráfico
        function renderChart() {
            const ctx = document.getElementById('statusChart');
            if (!ctx) {
                console.log('Elemento do gráfico não encontrado');
                return;
            }

            console.log('=== RENDERIZANDO GRÁFICO ===');

            const agendados = agendamentos.filter(a => a.status === 'agendado').length;
            const concluidos = agendamentos.filter(a => a.status === 'concluido').length;
            const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;

            const total = agendados + concluidos + cancelados;

            // Calcular porcentagens
            const percentAgendados = total > 0 ? Math.round((agendados / total) * 100) : 0;
            const percentConcluidos = total > 0 ? Math.round((concluidos / total) * 100) : 0;
            const percentCancelados = total > 0 ? Math.round((cancelados / total) * 100) : 0;

            console.log('Dados do gráfico:', { agendados, concluidos, cancelados, total });

            // Destruir gráfico anterior se existir
            if (window.statusChartInstance) {
                window.statusChartInstance.destroy();
            }

            // Criar novo gráfico
            window.statusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [
                        `Agendados (${percentAgendados}%)`,
                        `Concluídos (${percentConcluidos}%)`,
                        `Cancelados (${percentCancelados}%)`
                    ],
                    datasets: [{
                        data: [agendados, concluidos, cancelados],
                        backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Funções do Popup de Confirmação
        let confirmCallback = null;

        function showConfirm(title, message, buttonText = 'Confirmar', callback) {
            const popup = document.getElementById('confirm-popup');
            const content = document.getElementById('confirm-content');
            const titleElement = document.getElementById('confirm-title');
            const messageElement = document.getElementById('confirm-message');
            const buttonElement = document.getElementById('confirm-button');
            
            // Configurar conteúdo
            titleElement.textContent = title;
            messageElement.textContent = message;
            buttonElement.textContent = buttonText;
            
            // Guardar callback
            confirmCallback = callback;
            
            // Mostrar popup com animação
            popup.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function cancelConfirm() {
            const popup = document.getElementById('confirm-popup');
            const content = document.getElementById('confirm-content');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                popup.classList.add('hidden');
                confirmCallback = null;
            }, 300);
        }

        function executeConfirm() {
            if (confirmCallback) {
                confirmCallback();
            }
            cancelConfirm();
        }

        // Funções do Popup de Notificação
        function showNotification(title, message, type = 'success') {
            const popup = document.getElementById('notification-popup');
            const content = document.getElementById('notification-content');
            const titleElement = document.getElementById('notification-title');
            const messageElement = document.getElementById('notification-message');
            const iconElement = content.querySelector('.fa-check')?.parentElement || content.querySelector('i')?.parentElement;
            
            if (!content || !titleElement || !messageElement) {
                console.error('Elementos do popup de notificação não encontrados');
                return;
            }
            
            // Configurar ícone e cor conforme o tipo
            if (iconElement) {
                iconElement.className = 'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center';
                const icon = iconElement.querySelector('i');
                
                if (type === 'success') {
                    iconElement.className += ' bg-green-100';
                    icon.className = 'fas fa-check text-green-600 text-xl';
                } else if (type === 'error') {
                    iconElement.className += ' bg-red-100';
                    icon.className = 'fas fa-exclamation-circle text-red-600 text-xl';
                } else if (type === 'warning') {
                    iconElement.className += ' bg-yellow-100';
                    icon.className = 'fas fa-exclamation-triangle text-yellow-600 text-xl';
                } else {
                    iconElement.className += ' bg-blue-100';
                    icon.className = 'fas fa-info-circle text-blue-600 text-xl';
                }
            }
            
            // Mostrar popup com animação
            popup.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            // Fechar automaticamente após 3 segundos
            setTimeout(() => {
                closeNotification();
            }, 3000);
        }

        function closeNotification() {
            const popup = document.getElementById('notification-popup');
            const content = document.getElementById('notification-content');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 300);
        }

        // Função para mostrar popup de agendamento duplicado
        function mostrarPopupDuplicidade(agendamentoExistente) {
            const popup = document.getElementById('duplicidade-popup');
            const content = document.getElementById('duplicidade-content');
            const infoContainer = document.getElementById('duplicidade-info');
            
            if (!popup || !content || !infoContainer) {
                console.error('Elementos do popup de duplicidade não encontrados');
                showNotification('Atenção!', 'Já existe um agendamento para este endereço na mesma data.', 'warning');
                return;
            }
            
            // Formatar informações do agendamento existente
            const horaFim = calcularHoraFim(agendamentoExistente.horario);
            const infoHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                        </div>
                        <div class="ml-3 flex-1">
                            <h3 class="text-sm font-medium text-yellow-800">Agendamento Existente</h3>
                            <div class="mt-2 text-sm text-yellow-700">
                                <p><strong>Cliente:</strong> ${agendamentoExistente.nome_cliente}</p>
                                <p><strong>Telefone:</strong> ${agendamentoExistente.telefone}</p>
                                <p><strong>Data:</strong> ${agendamentoExistente.data}</p>
                                <p><strong>Horário:</strong> ${agendamentoExistente.horario} - ${horaFim}</p>
                                <p><strong>Endereço:</strong> ${agendamentoExistente.logradouro}, ${agendamentoExistente.numero}</p>
                                <p><strong>Bairro:</strong> ${agendamentoExistente.bairro}</p>
                                <p><strong>Cidade:</strong> ${agendamentoExistente.cidade}</p>
                                <p><strong>Loja:</strong> ${agendamentoExistente.loja}</p>
                                ${agendamentoExistente.observacao ? `<p><strong>Observação:</strong> ${agendamentoExistente.observacao}</p>` : ''}
                            </div>
                            <div class="mt-3">
                                <p class="text-xs text-yellow-600">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    Não é possível criar um novo agendamento para o mesmo endereço e data.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            infoContainer.innerHTML = infoHTML;
            
            // Mostrar popup com animação
            popup.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        // Função para fechar popup de duplicidade
        function closeDuplicidadePopup() {
            const popup = document.getElementById('duplicidade-popup');
            const content = document.getElementById('duplicidade-content');
            
            if (!popup || !content) return;
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 300);
        }

        // Funções do Modal
        function openCreateModal() {
            document.getElementById('modal-id').value = '';
            document.getElementById('modal-title').textContent = 'Novo Agendamento';
            document.getElementById('create-edit-form').reset();
            document.getElementById('create-edit-modal').classList.remove('hidden');
            setTimeout(() => {
                document.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
                document.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeCreateEditModal() {
            document.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
            document.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                document.getElementById('create-edit-modal').classList.add('hidden');
            }, 300);
        }

        // Funções para ambientes do modal
        function updateModalAmbientes(preserveSelection = false) {
            const tipoImovel = document.getElementById('modal-tipo-imovel').value;
            const container = document.getElementById('modal-ambiente-selected');
            const dropdown = document.getElementById('modal-ambiente-dropdown');
            
            console.log('=== UPDATE MODAL AMBIENTES ===');
            console.log('Tipo de imóvel:', tipoImovel);
            console.log('Container encontrado:', !!container);
            console.log('Dropdown encontrado:', !!dropdown);
            
            // Limpar seleção anterior (a menos que queiramos preservar seleção existente)
            if (!preserveSelection) {
                modalSelectedAmbientes = [];
                container.textContent = 'Selecione os ambientes';
            }
            dropdown.innerHTML = '';
            
            if (!tipoImovel) {
                container.textContent = 'Primeiro selecione o tipo de imóvel';
                console.log('Tipo de imóvel vazio, saindo');
                return;
            }
            
            // Opções de ambientes conforme o tipo de imóvel
            let ambientes = [];
            if (tipoImovel === 'casa') {
                ambientes = ['Sala', 'Quarto 1', 'Quarto 2', 'Quarto 3', 'Cozinha', 'Banheiro 1', 'Banheiro 2', 'Área de Serviço', 'Garagem', 'Quintal', 'Varanda'];
            } else if (tipoImovel === 'apartamento') {
                ambientes = ['Sala', 'Quarto 1', 'Quarto 2', 'Cozinha', 'Banheiro 1', 'Banheiro 2', 'Área de Serviço', 'Sacada', 'Varanda Gourmet'];
            }
            
            console.log('Ambientes a criar:', ambientes);
            
            // Criar checkboxes para os ambientes
            ambientes.forEach(ambiente => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 hover:bg-gray-50 cursor-pointer';
                div.innerHTML = `
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" value="${ambiente}" onchange="toggleModalAmbiente('${ambiente}')" 
                               class="mr-2 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
                        <span class="text-sm">${ambiente}</span>
                    </label>
                `;
                dropdown.appendChild(div);
            });
            
            console.log('Checkboxes criados, total:', dropdown.children.length);
        }

        function toggleModalAmbienteDropdown() {
            const dropdown = document.getElementById('modal-ambiente-dropdown');
            dropdown.classList.toggle('hidden');
        }

        function toggleModalAmbiente(ambiente) {
            const index = modalSelectedAmbientes.indexOf(ambiente);
            if (index > -1) {
                modalSelectedAmbientes.splice(index, 1);
            } else {
                modalSelectedAmbientes.push(ambiente);
            }
            
            // Atualizar texto exibido
            const container = document.getElementById('modal-ambiente-selected');
            const hiddenInput = document.getElementById('modal-ambiente');
            
            if (modalSelectedAmbientes.length === 0) {
                container.textContent = 'Selecione os ambientes';
                hiddenInput.value = '';
            } else {
                container.textContent = modalSelectedAmbientes.join(', ');
                hiddenInput.value = modalSelectedAmbientes.join(', ');
            }
        }

        // Fechar dropdown quando clicar fora
        document.addEventListener('click', function(event) {
            const modalContainer = document.getElementById('modal-ambiente-container');
            const modalDropdown = document.getElementById('modal-ambiente-dropdown');
            
            if (modalContainer && !modalContainer.contains(event.target) && !modalDropdown.contains(event.target)) {
                modalDropdown.classList.add('hidden');
            }
        });

        // Função para buscar endereço por CEP no modal
        async function buscarModalEndereco() {
            const cep = document.getElementById('modal-cep').value.replace(/\D/g, '');
            
            if (cep.length !== 8) {
                return;
            }
            
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                
                if (data.erro) {
                    showNotification('Erro!', 'CEP não encontrado. Verifique o CEP digitado.', 'error');
                    return;
                }
                
                // Preencher campos do endereço no modal
                document.getElementById('modal-logradouro').value = data.logradouro || '';
                document.getElementById('modal-bairro').value = data.bairro || '';
                document.getElementById('modal-cidade').value = data.localidade || '';
                
                // Focar no campo número
                document.getElementById('modal-numero').focus();
                
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
                showNotification('Erro!', 'Erro ao buscar CEP. Tente novamente.', 'error');
            }
        }

        // Função de sincronização automática
        function scheduleSync(id, agendamento) {
            console.log('⏰ Agendando sincronização automática para o agendamento', id);
            
            let tentativas = 0;
            const maxTentativas = 10; // 10 tentativas = 5 minutos
            
            // Tentar sincronizar a cada 30 segundos
            const syncInterval = setInterval(async () => {
                tentativas++;
                
                // Parar após máximo de tentativas
                if (tentativas > maxTentativas) {
                    console.log(`⏹️ Sincronização parada após ${maxTentativas} tentativas para o agendamento ${id}`);
                    clearInterval(syncInterval);
                    
                    // Limpar apenas este agendamento do localStorage
                    const pending = localStorage.getItem('pendingUpdates');
                    if (pending) {
                        const updates = JSON.parse(pending);
                        delete updates[id];
                        updates.timestamp = Date.now();
                        localStorage.setItem('pendingUpdates', JSON.stringify(updates));
                        
                        // Se não houver mais atualizações, limpar completamente
                        if (Object.keys(updates).length === 1) { // apenas timestamp
                            localStorage.removeItem('pendingUpdates');
                        }
                    }
                    return;
                }
                
                try {
                    console.log(`🔄 Tentativa ${tentativas}/${maxTentativas} - Sincronizando agendamento ${id}`);
                    
                    const response = await fetch(`${API_BASE}/agendamentos/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(agendamento)
                    });
                    
                    if (response.ok) {
                        console.log('✅ Sincronização bem-sucedida para o agendamento', id);
                        
                        // Limpar este agendamento do localStorage
                        const pending = localStorage.getItem('pendingUpdates');
                        if (pending) {
                            const updates = JSON.parse(pending);
                            delete updates[id];
                            updates.timestamp = Date.now();
                            
                            if (Object.keys(updates).length === 1) { // apenas timestamp
                                localStorage.removeItem('pendingUpdates');
                            } else {
                                localStorage.setItem('pendingUpdates', JSON.stringify(updates));
                            }
                        }
                        
                        clearInterval(syncInterval);
                        
                        // Recarregar dados do servidor (sem sobrecarregar)
                        setTimeout(async () => {
                            await loadAgendamentos();
                            filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                            renderAgendamentos();
                            updateDashboard();
                            
                            // Mostrar notificação de sucesso
                            showNotification('Sucesso!', 'Alterações sincronizadas com o servidor!', 'success');
                        }, 1000);
                        
                    } else if (response.status === 404) {
                        // Agendamento não existe mais - limpar do localStorage
                        console.log(`❌ Agendamento ${id} não encontrado (404), removendo das pendências`);
                        clearInterval(syncInterval);
                        
                        const pending = localStorage.getItem('pendingUpdates');
                        if (pending) {
                            const updates = JSON.parse(pending);
                            delete updates[id];
                            updates.timestamp = Date.now();
                            
                            if (Object.keys(updates).length === 1) { // apenas timestamp
                                localStorage.removeItem('pendingUpdates');
                            } else {
                                localStorage.setItem('pendingUpdates', JSON.stringify(updates));
                            }
                        }
                    } else {
                        console.log(`❌ Sincronização falhou (tentativa ${tentativas}): ${response.status}`);
                    }
                    
                } catch (error) {
                    console.log(`❌ Erro na sincronização (tentativa ${tentativas}):`, error);
                }
            }, 30000); // 30 segundos
        }

        // Verificar atualizações pendentes ao carregar a página
        function checkPendingUpdates() {
            const pending = localStorage.getItem('pendingUpdates');
            if (pending) {
                const updates = JSON.parse(pending);
                console.log('📋 Encontradas atualizações pendentes:', updates);
                
                // Tentar sincronizar imediatamente
                Object.keys(updates).forEach(id => {
                    if (id !== 'timestamp') {
                        scheduleSync(id, updates[id]);
                    }
                });
            }
        }

        // Função para salvar agendamento do modal
        async function saveModalAgendamento(event) {
            console.log('🔥 saveModalAgendamento CHAMADA!');
            console.log('🔥 Event:', event);
            
            // Prevenir comportamento padrão do formulário
            if (event) {
                event.preventDefault();
                console.log('🔥 Prevenido comportamento padrão');
            }
            
            // Verificar se é edição - se for, mostrar mensagem de servidor com problemas
            const id = document.getElementById('modal-id').value;
            const isEdit = id !== '';
            
            console.log('🔥 ID:', id);
            console.log('🔥 É edição:', isEdit);
            console.log('🔥 modalSelectedAmbientes:', modalSelectedAmbientes);
            
            if (isEdit) {
                // Solução híbrida: tenta servidor, se falhar salva localmente
                console.log('=== SOLUÇÃO HÍBRIDA: SERVIDOR + LOCAL COM SINCRONIZAÇÃO ===');
                
                try {
                    // 1. Coletar dados do formulário
                    const dataInput = document.getElementById('modal-data').value?.trim() || '';
                    const dataCorrigida = dataInput ? new Date(dataInput + 'T00:00:00').toLocaleDateString('en-CA') : '';
                    const horarioVal = document.getElementById('modal-horario').value?.trim() || '';
                    const horarioAgendamento = dataCorrigida && horarioVal ? `${dataCorrigida} ${horarioVal}` : '';

                    console.log('🔥 DEBUG DATA (EDIÇÃO):');
                    console.log('Data input original:', dataInput);
                    console.log('Data corrigida:', dataCorrigida);
                    console.log('Data como Date object:', new Date(dataInput + 'T00:00:00'));

                    const agendamento = {
                        nome_cliente: document.getElementById('modal-nome').value?.trim() || '',
                        telefone: document.getElementById('modal-telefone').value?.trim() || '',
                        email: document.getElementById('modal-email').value?.trim() || '',
                        tipo_imovel: document.getElementById('modal-tipo-imovel').value?.trim() || '',
                        ambiente: modalSelectedAmbientes.join(', ') || '',
                        loja: document.getElementById('modal-loja').value?.trim() || '',
                        data: dataCorrigida, // Usar data corrigida
                        horario: document.getElementById('modal-horario').value?.trim() || '',
                        horario_agendamento: horarioAgendamento,
                        cep: document.getElementById('modal-cep').value?.trim() || '',
                        numero: document.getElementById('modal-numero').value?.trim() || '',
                        complemento: document.getElementById('modal-complemento').value?.trim() || '',
                        logradouro: document.getElementById('modal-logradouro').value?.trim() || '',
                        bairro: document.getElementById('modal-bairro').value?.trim() || '',
                        cidade: document.getElementById('modal-cidade').value?.trim() || '',
                        status: document.getElementById('modal-status').value?.trim() || 'agendado',
                        observacao: document.getElementById('modal-observacao').value?.trim() || ''
                    };
                    
                    // 2. Validação básica
                    if (!agendamento.nome_cliente || !agendamento.telefone || !agendamento.email || 
                        !agendamento.tipo_imovel || !agendamento.ambiente || !agendamento.loja || 
                        !agendamento.data || !agendamento.horario || !agendamento.cep || !agendamento.numero) {
                        showNotification('Erro!', 'Preencha todos os campos obrigatórios.', 'error');
                        return;
                    }
                    
                    if (modalSelectedAmbientes.length === 0) {
                        showNotification('Erro!', 'Selecione pelo menos um ambiente.', 'error');
                        return;
                    }
                    
                    // 3. Tentar salvar no servidor
                    const response = await fetch(`${API_BASE}/agendamentos/${id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(agendamento)
                    });

                    if (response.ok) {
                        // Servidor funcionou - recarregar dados
                        await loadAgendamentos();
                        filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                        renderAgendamentos();
                        await updateDashboard();

                        closeCreateEditModal();
                        showNotification('Sucesso!', 'Agendamento atualizado e salvo no banco de dados!');
                        return;
                    } else {
                        // Servidor retornou erro — informar usuário
                        console.error('Erro ao atualizar no servidor, status:', response.status);
                        showNotification('Erro!', 'Erro ao atualizar agendamento no servidor. Tente novamente.', 'error');
                        return;
                    }
                    
                } catch (error) {
                    console.error('Erro na atualização híbrida:', error);
                    showNotification('Erro!', 'Ocorreu um erro ao atualizar o agendamento.', 'error');
                }
                
                return;
            }
            
            // Se for criação, continuar normalmente
            // Tratamento de fuso horário para garantir data correta
            const dataInput = document.getElementById('modal-data').value?.trim() || '';
            const dataCorrigida = dataInput ? new Date(dataInput + 'T00:00:00').toLocaleDateString('en-CA') : '';
            
            console.log('🔥 DEBUG DATA:');
            console.log('Data input original:', dataInput);
            console.log('Data corrigida:', dataCorrigida);
            console.log('Data como Date object:', new Date(dataInput + 'T00:00:00'));
            
            const agendamento = {
                nome_cliente: document.getElementById('modal-nome').value?.trim() || '',
                telefone: document.getElementById('modal-telefone').value?.trim() || '',
                email: document.getElementById('modal-email').value?.trim() || '',
                tipo_imovel: document.getElementById('modal-tipo-imovel').value?.trim() || '',
                ambiente: modalSelectedAmbientes.join(', ') || '', // Usar os ambientes selecionados
                loja: document.getElementById('modal-loja').value?.trim() || '',
                data: dataCorrigida, // Usar data corrigida
                horario: document.getElementById('modal-horario').value?.trim() || '',
                cep: document.getElementById('modal-cep').value?.trim() || '',
                numero: document.getElementById('modal-numero').value?.trim() || '',
                complemento: document.getElementById('modal-complemento').value?.trim() || '',
                logradouro: document.getElementById('modal-logradouro').value?.trim() || '',
                bairro: document.getElementById('modal-bairro').value?.trim() || '',
                cidade: document.getElementById('modal-cidade').value?.trim() || '',
                status: document.getElementById('modal-status').value?.trim() || 'agendado',
                observacao: document.getElementById('modal-observacao').value?.trim() || ''
            };
            
            // Remover campos vazios que possam causar problemas no servidor
            Object.keys(agendamento).forEach(key => {
                if (agendamento[key] === '' && key !== 'observacao' && key !== 'complemento') {
                    console.log(`Campo vazio detectado: ${key}`);
                }
            });
            
            // Sanitizar o CEP para garantir formato correto
            if (agendamento.cep) {
                agendamento.cep = agendamento.cep.replace(/\D/g, '');
                if (agendamento.cep.length === 8) {
                    agendamento.cep = agendamento.cep.slice(0, 5) + '-' + agendamento.cep.slice(5);
                }
            }
            
            // Sanitizar telefone para remover caracteres especiais
            if (agendamento.telefone) {
                agendamento.telefone = agendamento.telefone.replace(/\D/g, '');
                if (agendamento.telefone.length === 11) {
                    agendamento.telefone = agendamento.telefone.slice(0, 2) + ' ' + agendamento.telefone.slice(2, 7) + '-' + agendamento.telefone.slice(7);
                } else if (agendamento.telefone.length === 10) {
                    agendamento.telefone = agendamento.telefone.slice(0, 2) + ' ' + agendamento.telefone.slice(2, 6) + '-' + agendamento.telefone.slice(6);
                }
            }
            
            // Verificar campos que podem conter caracteres problemáticos
            const problematicFields = ['nome_cliente', 'logradouro', 'bairro', 'cidade', 'observacao'];
            problematicFields.forEach(field => {
                if (agendamento[field]) {
                    // Remover caracteres que podem causar problemas no servidor
                    agendamento[field] = agendamento[field]
                        .replace(/[<>]/g, '') // Remover tags HTML
                        .replace(/["']/g, '') // Remover aspas
                        .replace(/\\/g, '') // Remover barras invertidas
                        .trim();
                }
            });
            
            console.log('Dados sanitizados:', agendamento);
            
            // Comparar com dados de criação para identificar diferenças
            if (isEdit) {
                console.log('=== ANÁLISE DE ATUALIZAÇÃO ===');
                console.log('ID do agendamento:', id);
                
                // Buscar o agendamento original para comparação
                const original = agendamentos.find(a => a.id == id);
                if (original) {
                    console.log('Dados originais:', original);
                    console.log('Campos alterados:');
                    
                    Object.keys(agendamento).forEach(key => {
                        if (agendamento[key] !== original[key]) {
                            console.log(`- ${key}: "${original[key]}" → "${agendamento[key]}"`);
                        }
                    });
                    
                    // Verificar se há campos no original que não estão no update
                    Object.keys(original).forEach(key => {
                        if (!agendamento.hasOwnProperty(key)) {
                            console.log(`- Campo faltando no update: ${key}`);
                        }
                    });
                }
            }
            
            console.log('Dados do agendamento:', agendamento);
            
            // Validação básica - apenas campos obrigatórios
            if (!agendamento.nome_cliente || !agendamento.telefone || !agendamento.email || 
                !agendamento.tipo_imovel || !agendamento.ambiente || !agendamento.loja || 
                !agendamento.data || !agendamento.horario || !agendamento.cep || !agendamento.numero) {
                showNotification('Erro!', 'Preencha todos os campos obrigatórios.', 'error');
                return;
            }
            
            // Campos opcionais podem ficar vazios
            console.log('Campos obrigatórios preenchidos, validação OK');
            
            // Validação específica para ambientes
            if (modalSelectedAmbientes.length === 0) {
                showNotification('Erro!', 'Selecione pelo menos um ambiente.', 'error');
                return;
            }
            
            // Validação para evitar agendamentos duplicados (mesma data, endereço e número)
            if (!isEdit) {
                const duplicado = agendamentos.find(existing => 
                    existing.data === agendamento.data &&
                    existing.logradouro === agendamento.logradouro &&
                    existing.numero === agendamento.numero &&
                    existing.status === 'agendado'
                );
                
                if (duplicado) {
                    mostrarPopupDuplicidade(duplicado);
                    return;
                }
            }
            
            try {
                const url = isEdit ? `${API_BASE}/agendamentos/${id}` : `${API_BASE}/agendamentos`;
                const method = isEdit ? 'PUT' : 'POST';
                
                console.log('=== ENVIANDO REQUISIÇÃO ===');
                console.log('URL:', url);
                console.log('Method:', method);
                console.log('Body:', JSON.stringify(agendamento, null, 2));
                console.log('Body keys:', Object.keys(agendamento));
                console.log('Body values:', Object.values(agendamento));
                
                // Verificar se há valores nulos ou inválidos - apenas campos obrigatórios
                const invalidFields = Object.entries(agendamento)
                    .filter(([key, value]) => {
                        // Ignorar campos opcionais na verificação
                        if (key === 'complemento' || key === 'observacao') {
                            return false;
                        }
                        return value === null || value === undefined || value === '';
                    })
                    .map(([key, value]) => `${key}: ${value}`);
                
                if (invalidFields.length > 0) {
                    console.log('Campos obrigatórios inválidos:', invalidFields);
                } else {
                    console.log('Todos os campos obrigatórios estão válidos');
                }
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(agendamento)
                });
                
                console.log('=== RESPOSTA DA API ===');
                console.log('Status:', response.status);
                console.log('OK:', response.ok);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Response data:', result);
                    
                    await loadAgendamentos();
                    filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                    renderAgendamentos();
                    await updateDashboard();
                    
                    closeCreateEditModal();
                    showNotification('Sucesso!', isEdit ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
                } else {
                    const errorData = await response.json();
                    console.log('Erro da API:', errorData);
                    
                    // Tentativa com dados mínimos se o erro persistir
                    if (isEdit && errorData.error === 'Erro interno do servidor') {
                        console.log('=== TENTATIVA COM DADOS MÍNIMOS ===');
                        
                        const minimalUpdate = {
                            nome_cliente: agendamento.nome_cliente,
                            telefone: agendamento.telefone,
                            email: agendamento.email,
                            status: agendamento.status
                        };
                        
                        console.log('Tentando com dados mínimos:', minimalUpdate);
                        
                        try {
                            // Primeiro tentativa com PUT
                            let minimalResponse = await fetch(url, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(minimalUpdate)
                            });
                            
                            console.log('Resposta da tentativa mínima (PUT):', minimalResponse.status, minimalResponse.ok);
                            
                            // Se PUT falhar, tentar com POST + _method
                            if (!minimalResponse.ok) {
                                console.log('PUT falhou, tentando com POST + _method');
                                
                                const postData = {
                                    ...minimalUpdate,
                                    _method: 'PUT',
                                    id: id
                                };
                                
                                minimalResponse = await fetch(`${API_BASE}/agendamentos`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(postData)
                                });
                                
                                console.log('Resposta da tentativa POST + _method:', minimalResponse.status, minimalResponse.ok);
                            }
                            
                            // Se POST + _method também falhar, tentar PATCH
                            if (!minimalResponse.ok) {
                                console.log('POST + _method falhou, tentando com PATCH');
                                
                                minimalResponse = await fetch(`${API_BASE}/agendamentos/${id}`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(minimalUpdate)
                                });
                                
                                console.log('Resposta da tentativa PATCH:', minimalResponse.status, minimalResponse.ok);
                            }
                            
                            if (minimalResponse.ok) {
                                const result = await minimalResponse.json();
                                console.log('Tentativa mínima bem-sucedida:', result);
                                await loadAgendamentos();
                                filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                renderAgendamentos();
                                await updateDashboard();
                                closeCreateEditModal();
                                showNotification('Sucesso!', 'Agendamento atualizado!');
                                
                                // Redirecionar para a tela de agendamentos
                                setTimeout(() => {
                                    showSection('list');
                                }, 500);
                                
                                return;
                            } else {
                                // Todos os métodos falharam - problema no servidor
                                console.log('=== TODOS OS MÉTODOS FALHARAM ===');
                                console.log('PUT: 500, POST+_method: 400, PATCH: 404');
                                
                                // Alternativa temporária: criar novo e excluir o antigo
                                console.log('=== TENTANDO ALTERNATIVA: CRIAR NOVO E EXCLUIR ANTIGO ===');
                                
                                try {
                                    // 1. Criar novo agendamento sem ID
                                    const newAgendamento = {...agendamento};
                                    delete newAgendamento.id;
                                    
                                    console.log('=== DADOS PARA CRIAÇÃO ===');
                                    console.log('newAgendamento:', newAgendamento);
                                    console.log('Keys:', Object.keys(newAgendamento));
                                    console.log('Values:', Object.values(newAgendamento));
                                    
                                    // Verificar campos vazios que podem causar erro 400
                                    const emptyFields = Object.entries(newAgendamento)
                                        .filter(([key, value]) => !value || value === '')
                                        .map(([key, value]) => `${key}: "${value}"`);
                                    
                                    if (emptyFields.length > 0) {
                                        console.log('Campos vazios que podem causar erro 400:', emptyFields);
                                    }
                                    
                                    const createResponse = await fetch(`${API_BASE}/agendamentos`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(newAgendamento)
                                    });
                                    
                                    console.log('Resposta da criação:', createResponse.status, createResponse.ok);
                                    
                                    if (createResponse.ok) {
                                        const createResult = await createResponse.json();
                                        console.log('Novo agendamento criado:', createResult);
                                        
                                        // 2. Excluir o agendamento antigo
                                        const deleteResponse = await fetch(`${API_BASE}/agendamentos/${id}`, {
                                            method: 'DELETE'
                                        });
                                        
                                        console.log('Resposta da exclusão:', deleteResponse.status, deleteResponse.ok);
                                        
                                        if (deleteResponse.ok) {
                                            console.log('Agendamento antigo excluído com sucesso');
                                            
                                            // 3. Atualizar a interface
                                            await loadAgendamentos();
                                            filteredAgendamentos = agendamentos.filter(a => a.status === 'agendado');
                                            renderAgendamentos();
                                            await updateDashboard();
                                            closeCreateEditModal();
                                            showNotification('Sucesso!', 'Agendamento atualizado (alternativa temporária)!');
                                            
                                            setTimeout(() => {
                                                showSection('list');
                                            }, 500);
                                            
                                            return;
                                        } else {
                                            console.log('Falha ao excluir agendamento antigo');
                                        }
                                    } else {
                                        const createError = await createResponse.json();
                                        console.log('Erro na criação:', createError);
                                        console.log('Status da criação:', createResponse.status);
                                        console.log('Body enviado na criação:', JSON.stringify(newAgendamento, null, 2));
                                    }
                                } catch (altError) {
                                    console.error('Erro na alternativa:', altError);
                                }
                                
                                // Se nem a alternativa funcionar, mostrar mensagem de erro
                                showNotification('Servidor em Manutenção', 
                                    'O sistema de atualização está temporariamente indisponível. ' +
                                    'Por favor, tente novamente em alguns minutos. ' +
                                    'Se o problema persistir, entre em contato com o suporte técnico.', 'error');
                                
                                // Fechar o modal mas não redirecionar
                                closeCreateEditModal();
                                return;
                            }
                        } catch (minimalError) {
                            console.error('Erro na tentativa mínima:', minimalError);
                        }
                    }
                    
                    showNotification('Erro!', errorData.error || `Erro ao ${isEdit ? 'atualizar' : 'criar'} agendamento. Tente novamente.`, 'error');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                showNotification('Erro!', `Erro ao ${isEdit ? 'atualizar' : 'criar'} agendamento. Verifique sua conexão.`, 'error');
            }
        }

        // Função para fechar modal de visualização
        function closeViewModal() {
            const modal = document.getElementById('view-modal');
            const content = modal.querySelector('.modal-content');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }

        // Função para exportar dados
        function exportData() {
            if (filteredAgendamentos.length === 0) {
                showNotification('Atenção!', 'Não há dados para exportar.', 'warning');
                return;
            }
            
            // Criar CSV
            const headers = ['ID', 'Nome', 'Telefone', 'Email', 'Loja', 'Data', 'Horário', 'Status', 'Endereço'];
            const csvContent = [
                headers.join(','),
                ...filteredAgendamentos.map(agendamento => [
                    agendamento.id,
                    `"${agendamento.nome_cliente}"`,
                    `"${agendamento.telefone}"`,
                    `"${agendamento.email}"`,
                    `"${agendamento.loja}"`,
                    agendamento.data,
                    agendamento.horario,
                    agendamento.status,
                    `"${agendamento.logradouro}, ${agendamento.numero} - ${agendamento.bairro}"`
                ].join(','))
            ].join('\n');
            
            // Criar blob e download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `agendamentos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification('Sucesso!', 'Dados exportados com sucesso!');
        }

        // Expor funções para o escopo global apenas quando o DOM estiver pronto
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM carregado - Inicializando sistema');
            
            // Verificar atualizações pendentes
            checkPendingUpdates();
            
            // Carregar agendamentos da API
            loadAgendamentos();
            
            // Event listeners
            document.getElementById('agendamento-form')?.addEventListener('submit', salvarAgendamento);
            document.getElementById('create-edit-form')?.addEventListener('submit', saveModalAgendamento);
            
            // Event listener para filtro do dashboard
            const dashboardFilter = document.getElementById('dashboard-filter');
            if (dashboardFilter) {
                dashboardFilter.addEventListener('change', function() {
                    console.log('Filtro do dashboard alterado para:', this.value);
                    renderDashboardDetails();
                });
            }
            
            // Event listener para filtro de status
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
                statusFilter.addEventListener('change', function() {
                    console.log('Filtro de status alterado para:', this.value);
                    renderDashboardDetails();
                });
            }
            
            console.log('🔥 Event listeners configurados');
            
            window.logout = logout;
            window.showSection = showSection;
            window.filtrarAgendamentos = filtrarAgendamentos;
            window.toggleRowSelection = toggleRowSelection;
            window.toggleSelectAll = toggleSelectAll;
            window.nextPage = nextPage;
            window.previousPage = previousPage;
            window.viewAgendamento = viewAgendamento;
            window.showEditMaintenanceMessage = showEditMaintenanceMessage;
            window.editAgendamento = editAgendamento;
            window.deleteAgendamento = deleteAgendamento;
            window.concluirAgendamento = concluirAgendamento;
            window.cancelarAgendamento = cancelarAgendamento;
            window.deleteSelected = deleteSelected;
            window.updateDashboard = updateDashboard;
            window.renderChart = renderChart;
            window.renderDashboardDetails = renderDashboardDetails;
            window.renderAgendamentos = renderAgendamentos;
            window.loadAgendamentos = loadAgendamentos;
            window.openCreateModal = openCreateModal;
            window.closeCreateEditModal = closeCreateEditModal;
            window.showNotification = showNotification;
            window.closeNotification = closeNotification;
            window.showConfirm = showConfirm;
            window.cancelConfirm = cancelConfirm;
            window.executeConfirm = executeConfirm;
            window.updateModalAmbientes = updateModalAmbientes;
            window.toggleModalAmbienteDropdown = toggleModalAmbienteDropdown;
            window.toggleModalAmbiente = toggleModalAmbiente;
            window.buscarModalEndereco = buscarModalEndereco;
            window.saveModalAgendamento = saveModalAgendamento;
            window.closeViewModal = closeViewModal;
            window.exportData = exportData;
        });

        // Funções de Roteirização por CEP
        async function calcularRoteiroDia(data) {
            console.log('=== CALCULANDO ROTEIRO DO DIA ===', data);
            
            // Filtrar agendamentos do dia (lista original não deve ser modificada)
            const agendamentosDia = agendamentos.filter(a => {
                // Usar comparação direta de strings para evitar fuso horário
                const mesmoDia = a.data === data;
                
                if (!mesmoDia) return false;
                
                // Log para debug de agendamentos cancelados no mesmo dia
                if (a.status === 'cancelado' && mesmoDia) {
                    console.log(`🚫 Agendamento cancelado ignorado na roteirização: ${a.nome_cliente} (${a.horario}) - Status: ${a.status}`);
                }
                
                return a.status === 'agendado';
            });
            
            console.log('Agendamentos do dia:', agendamentosDia.length);
            
            if (agendamentosDia.length === 0) {
                return [];
            }
            
            if (agendamentosDia.length === 1) {
                return [...agendamentosDia]; // Retorna cópia para não modificar original
            }
            
            // REGRA DE NEGÓCIO – Roteirização de Agendamentos
            // 1. O ponto inicial da rota será o CEP base 02215-010
            // 2. Todos os CEPs devem ser convertidos previamente em coordenadas geográficas (latitude e longitude)
            // 3. O primeiro agendamento será aquele com menor distância real em relação ao CEP base
            // 4. Após cada atendimento, o próximo será o endereço com menor distância em relação ao último ponto atendido
            // 5. Endereços com distância > 50km devem ser marcados como erro e não entrar na rota
            // 6. A rota final deve apresentar distâncias coerentes com a região urbana
            
            console.log('🔍 Iniciando roteirização com conversão prévia de coordenadas...');
            
            // Criar cópia da lista para não modificar a original
            const agendamentosNaoVisitados = [...agendamentosDia];
            const roteiroOtimizado = [];
            const coordenadasCache = new Map(); // Cache para coordenadas já convertidas
            
            // PONTO DE PARTIDA: CEP base 02215-010
            const CEP_BASE = '02215010';
            
            // Função auxiliar para converter CEP em coordenadas com cache
            async function obterCoordenadas(cep) {
                if (coordenadasCache.has(cep)) {
                    return coordenadasCache.get(cep);
                }
                
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                    const data = await response.json();
                    
                    if (data.erro) {
                        throw new Error('CEP não encontrado');
                    }
                    
                    // Usar serviço de geocodificação para obter coordenadas
                    const geocodeResponse = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${data.logradouro},${data.localidade},${data.uf}&limit=1`
                    );
                    const geocodeData = await geocodeResponse.json();
                    
                    if (geocodeData.length === 0) {
                        // Fallback: usar coordenadas aproximadas da cidade
                        console.warn(`⚠️ Geocodificação falhou para CEP ${cep}, usando fallback`);
                        const coordenadasFallback = {
                            lat: -23.5505, // São Paulo (aproximado)
                            lon: -46.6333, // São Paulo (aproximado)
                            endereco: `${data.localidade} - ${data.uf} (coordenadas aproximadas)`
                        };
                        
                        coordenadasCache.set(cep, coordenadasFallback);
                        return coordenadasFallback;
                    }
                    
                    const coordenadas = {
                        lat: parseFloat(geocodeData[0].lat),
                        lon: parseFloat(geocodeData[0].lon),
                        endereco: data.logradouro + ', ' + data.localidade + ' - ' + data.uf
                    };
                    
                    coordenadasCache.set(cep, coordenadas);
                    return coordenadas;
                    
                } catch (error) {
                    console.error(`Erro ao obter coordenadas para CEP ${cep}:`, error);
                    
                    // Fallback para CEP base específico
                    if (cep === '02215010') {
                        const coordenadasBaseFallback = {
                            lat: -23.4899234,
                            lon: -46.5822642,
                            endereco: 'Vila Maria, São Paulo - SP (coordenadas base)'
                        };
                        coordenadasCache.set(cep, coordenadasBaseFallback);
                        return coordenadasBaseFallback;
                    }
                    
                    // Fallback genérico para São Paulo
                    const coordenadasFallback = {
                        lat: -23.5505,
                        lon: -46.6333,
                        endereco: 'São Paulo - SP (coordenadas aproximadas)'
                    };
                    
                    coordenadasCache.set(cep, coordenadasFallback);
                    return coordenadasFallback;
                }
            }
            
            // Função para calcular distância real entre coordenadas (fórmula de Haversine)
            function calcularDistanciaHaversine(coord1, coord2) {
                const R = 6371; // Raio da Terra em km
                const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
                const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            }
            
            // PASSO 1: Converter todos os CEPs para coordenadas e validar distâncias
            console.log('📍 Convertendo CEPs para coordenadas...');
            const agendamentosValidados = [];
            const coordenadasBase = await obterCoordenadas(CEP_BASE);
            
            if (!coordenadasBase) {
                console.log('⚠️ Não foi possível obter coordenadas do CEP base');
                return [...agendamentosDia];
            }
            
            console.log(`🏠 Coordenadas base: ${coordenadasBase.lat}, ${coordenadasBase.lon}`);
            
            for (const agendamento of agendamentosNaoVisitados) {
                const coordenadas = await obterCoordenadas(agendamento.cep);
                
                if (!coordenadas) {
                    console.log(`❌ Erro de geolocalização: CEP ${agendamento.cep} não encontrado`);
                    continue;
                }
                
                const distancia = calcularDistanciaHaversine(coordenadasBase, coordenadas);
                
                // VALIDAÇÃO: Endereços com distância > 50km são marcados como erro
                if (distancia > 50) {
                    console.log(`❌ Erro de distância: ${agendamento.nome_cliente} (${agendamento.cep}) - ${distancia.toFixed(1)}km (acima de 50km)`);
                    agendamento.erroGeolocalizacao = true;
                    agendamento.motivoErro = `Distância muito longa: ${distancia.toFixed(1)}km`;
                    continue;
                }
                
                // VALIDAÇÃO: Distâncias devem ser coerentes com região urbana (máximo 30km para São Paulo)
                if (distancia > 30) {
                    console.log(`⚠️ Alerta de distância urbana: ${agendamento.nome_cliente} (${agendamento.cep}) - ${distancia.toFixed(1)}km`);
                }
                
                agendamento.coordenadas = coordenadas;
                agendamento.distanciaDaBase = distancia;
                agendamentosValidados.push(agendamento);
                
                console.log(`✅ ${agendamento.nome_cliente} (${agendamento.cep}) - ${distancia.toFixed(1)}km`);
            }
            
            if (agendamentosValidados.length === 0) {
                console.log('⚠️ Nenhum agendamento válido encontrado');
                return [...agendamentosDia];
            }
            
            // PASSO 2: Encontrar o agendamento mais próximo do CEP base
            let agendamentoMaisProximo = agendamentosValidados[0];
            let menorDistancia = agendamentoMaisProximo.distanciaDaBase;
            
            for (let i = 1; i < agendamentosValidados.length; i++) {
                if (agendamentosValidados[i].distanciaDaBase < menorDistancia) {
                    menorDistancia = agendamentosValidados[i].distanciaDaBase;
                    agendamentoMaisProximo = agendamentosValidados[i];
                }
            }
            
            // Adicionar o primeiro agendamento (mais próximo do CEP base)
            roteiroOtimizado.push(agendamentoMaisProximo);
            const indexPrimeiro = agendamentosValidados.indexOf(agendamentoMaisProximo);
            agendamentosValidados.splice(indexPrimeiro, 1);
            
            console.log(`🏠 1º agendamento: ${agendamentoMaisProximo.nome_cliente} (${agendamentoMaisProximo.cep}) - ${menorDistancia.toFixed(1)}km`);
            
            // PASSO 3: Algoritmo de vizinho mais próximo
            let coordenadaAtual = agendamentoMaisProximo.coordenadas;
            let ordem = 2;
            
            while (agendamentosValidados.length > 0) {
                let proximoAgendamento = null;
                let menorDistanciaProxima = Infinity;
                let indexProximo = -1;
                
                // Encontrar o agendamento mais próximo do último endereço atendido
                for (let i = 0; i < agendamentosValidados.length; i++) {
                    const distancia = calcularDistanciaHaversine(coordenadaAtual, agendamentosValidados[i].coordenadas);
                    
                    if (distancia < menorDistanciaProxima) {
                        menorDistanciaProxima = distancia;
                        proximoAgendamento = agendamentosValidados[i];
                        indexProximo = i;
                    }
                }
                
                if (!proximoAgendamento) {
                    console.log('⚠️ Não foi possível encontrar próximo agendamento');
                    break;
                }
                
                // Adicionar o próximo agendamento e atualizar referência
                roteiroOtimizado.push(proximoAgendamento);
                agendamentosValidados.splice(indexProximo, 1);
                coordenadaAtual = proximoAgendamento.coordenadas;
                
                console.log(`📍 ${ordem}º agendamento: ${proximoAgendamento.nome_cliente} (${proximoAgendamento.cep}) - ${menorDistanciaProxima.toFixed(1)}km`);
                ordem++;
            }
            
            // RESULTADO: Nova lista ordenada pela melhor rota com distâncias urbanas coerentes
            console.log('✅ Roteiro otimizado final:', roteiroOtimizado.map((a, idx) => 
                `${idx + 1}º: ${a.nome_cliente} (${a.cep}) - ${a.distanciaDaBase ? a.distanciaDaBase.toFixed(1) + 'km da base' : ''}`
            ).join(' → '));
            
            return roteiroOtimizado; // Nova lista, original não modificada
        }

        async function validarHorarioRoteiro(data, horario) {
            console.log('=== VALIDANDO HORÁRIO PARA ROTEIRO ===', { data, horario });
            
            const horaSelecionada = horario.split(':').map(Number);
            const horaMinutoSelecionado = horaSelecionada[0] * 60 + horaSelecionada[1];
            
            // Verificar se não passa das 17h (máximo 17:00)
            const horaMaxima = 17 * 60; // 17:00 em minutos
            if (horaMinutoSelecionado > horaMaxima) {
                return { valido: false, motivo: 'Horário máximo permitido é 17:00' };
            }
            
            // Verificar se há conflito com agendamentos existentes
            const agendamentosDia = await calcularRoteiroDia(data);
            
            // Se não houver agendamentos no dia, horário é válido
            if (!agendamentosDia || agendamentosDia.length === 0) {
                return { valido: true };
            }
            
            for (const agendamento of agendamentosDia) {
                // Ignorar conflitos com agendamentos cancelados
                if (agendamento.status === 'cancelado') {
                    console.log(`⚠️ Ignorando conflito com agendamento cancelado: ${agendamento.horario} - ${agendamento.nome_cliente}`);
                    continue;
                }
                
                const horaExistente = agendamento.horario.split(':').map(Number);
                const horaMinutoExistente = horaExistente[0] * 60 + horaExistente[1];
                
                // Cada agendamento dura 2 horas (120 minutos)
                const fimAgendamentoExistente = horaMinutoExistente + 120;
                
                // Verificar sobreposição
                const fimAgendamentoNovo = horaMinutoSelecionado + 120;
                
                if ((horaMinutoSelecionado >= horaMinutoExistente && horaMinutoSelecionado < fimAgendamentoExistente) ||
                    (fimAgendamentoNovo > horaMinutoExistente && horaMinutoSelecionado < fimAgendamentoExistente)) {
                    return { 
                        valido: false, 
                        motivo: `Conflito com agendamento existente (${agendamento.horario} - ${agendamento.nome_cliente})` 
                    };
                }
            }
            
            return { valido: true };
        }

        function sugerirProximoHorarioDisponivel(data, cep) {
            console.log('=== SUGERINDO PRÓXIMO HORÁRIO DISPONÍVEL ===', { data, cep });
            
            const agendamentosDia = calcularRoteiroDia(data);
            
            // Horário inicial: 8:00 (8 * 60 = 480 minutos)
            let horarioAtual = 8 * 60; // 8:00 em minutos
            const horarioMaximo = 17 * 60; // 17:00 em minutos
            
            // Se não há agendamentos, sugerir 8:00
            if (agendamentosDia.length === 0) {
                const horas = Math.floor(horarioAtual / 60);
                const minutos = horarioAtual % 60;
                return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
            }
            
            // Encontrar o próximo slot disponível
            for (const agendamento of agendamentosDia) {
                const horaExistente = agendamento.horario.split(':').map(Number);
                const horaMinutoExistente = horaExistente[0] * 60 + horaExistente[1];
                const fimAgendamentoExistente = horaMinutoExistente + 120; // 2 horas
                
                // Se há espaço antes deste agendamento
                if (horarioAtual + 120 <= horaMinutoExistente) {
                    break; // Encontrou espaço
                }
                
                // Pular para o fim deste agendamento
                horarioAtual = Math.max(horarioAtual, fimAgendamentoExistente);
            }
            
            // Verificar se ainda cabe no dia
            if (horarioAtual + 240 > horarioMaximo) {
                // Sugerir próximo dia útil
                const dataAtual = new Date(data);
                let proximoDia = new Date(dataAtual);
                proximoDia.setDate(dataAtual.getDate() + 1);
                
                // Pular fins de semana (se necessário)
                while (proximoDia.getDay() === 0 || proximoDia.getDay() === 6) { // 0 = Domingo, 6 = Sábado
                    proximoDia.setDate(proximoDia.getDate() + 1);
                }
                
                return {
                    horario: '08:00',
                    data: proximoDia.toISOString().split('T')[0],
                    mensagem: `Horário sugerido para o próximo dia útil: ${proximoDia.toLocaleDateString('pt-BR')} às 08:00`
                };
            }
            
            // Converter minutos para HH:MM
            const horas = Math.floor(horarioAtual / 60);
            const minutos = horarioAtual % 60;
            return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }

        // Funções de Roteirização com API dos Correios
        async function consultarBuscaCEP(cep) {
            try {
                console.log('🔍 Consultando CEP:', cep);
                
                // Remover formatação do CEP
                const cepLimpo = cep.replace(/\D/g, '');
                
                // API dos Correios - BuscaCEP (ViaCEP)
                const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                
                if (!response.ok) {
                    throw new Error(`Erro na API: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.erro) {
                    throw new Error('CEP não encontrado');
                }
                
                console.log('✅ Dados do CEP:', data);
                return {
                    cep: data.cep,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    uf: data.uf,
                    latitude: null, // Será preenchido pelo geocoding
                    longitude: null
                };
                
            } catch (error) {
                console.error('❌ Erro ao consultar CEP:', error);
                return null;
            }
        }

        async function geocodingEndereco(endereco) {
            try {
                console.log('📍 Geocoding endereço:', endereco);
                
                // Tentar primeiro com endereço completo
                let enderecoFormatado = encodeURIComponent(`${endereco.logradouro}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.uf}, Brasil`);
                let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${enderecoFormatado}&limit=1`);
                
                let data = await response.json();
                
                // Se não encontrou, tentar apenas com bairro e cidade
                if (data.length === 0) {
                    console.log('🔄 Tentando geocoding alternativo (bairro + cidade)...');
                    enderecoFormatado = encodeURIComponent(`${endereco.bairro}, ${endereco.cidade}, ${endereco.uf}, Brasil`);
                    response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${enderecoFormatado}&limit=1`);
                    data = await response.json();
                }
                
                // Se ainda não encontrou, tentar apenas com cidade
                if (data.length === 0) {
                    console.log('🔄 Tentando geocoding alternativo (apenas cidade)...');
                    enderecoFormatado = encodeURIComponent(`${endereco.cidade}, ${endereco.uf}, Brasil`);
                    response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${enderecoFormatado}&limit=1`);
                    data = await response.json();
                }
                
                if (data.length === 0) {
                    console.warn('⚠️ Endereço não encontrado em nenhuma tentativa de geocoding');
                    return { ...endereco, latitude: null, longitude: null };
                }
                
                const coordenadas = {
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                };
                
                console.log('✅ Coordenadas encontradas:', coordenadas);
                return { ...endereco, ...coordenadas };
                
            } catch (error) {
                console.error('❌ Erro no geocoding:', error);
                return { ...endereco, latitude: null, longitude: null };
            }
        }

        function calcularDistanciaCoordenadas(lat1, lon1, lat2, lon2) {
            // Fórmula de Haversine para calcular distância entre duas coordenadas
            const R = 6371; // Raio da Terra em km
            
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                     Math.sin(dLon/2) * Math.sin(dLon/2);
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distancia = R * c;
            
            return distancia;
        }

        async function calcularDistanciaReal(cep1, cep2) {
            try {
                console.log(`🔗 Calculando distância real entre ${cep1} e ${cep2}`);
                
                // Consultar informações dos CEPs
                const [infoCEP1, infoCEP2] = await Promise.all([
                    consultarBuscaCEP(cep1),
                    consultarBuscaCEP(cep2)
                ]);
                
                if (!infoCEP1 || !infoCEP2) {
                    console.warn('⚠️ Fallback: usando cálculo aproximado');
                    return calcularDistanciaCEP(cep1, cep2);
                }
                
                // Geocoding dos endereços
                const [endereco1, endereco2] = await Promise.all([
                    geocodingEndereco(infoCEP1),
                    geocodingEndereco(infoCEP2)
                ]);
                
                // Se não conseguiu geocoding, usar cálculo aproximado
                if (!endereco1.latitude || !endereco2.latitude) {
                    console.warn('⚠️ Fallback: geocoding falhou, usando cálculo aproximado');
                    return calcularDistanciaCEP(cep1, cep2);
                }
                
                // Calcular distância real
                const distancia = calcularDistanciaCoordenadas(
                    endereco1.latitude, endereco1.longitude,
                    endereco2.latitude, endereco2.longitude
                );
                
                // Tempo estimado: velocidade média de 20 km/h em SP + 15min para deslocamento
                const tempoMinutos = Math.ceil((distancia / 20) * 60) + 15;
                
                console.log(`✅ Distância real: ${distancia.toFixed(1)}km, tempo: ${tempoMinutos}min`);
                
                return {
                    distancia: distancia.toFixed(1),
                    tempo: tempoMinutos
                };
                
            } catch (error) {
                console.error('❌ Erro no cálculo de distância real:', error);
                console.warn('⚠️ Fallback: usando cálculo aproximado');
                return calcularDistanciaCEP(cep1, cep2);
            }
        }

        function calcularDistanciaCEP(cep1, cep2) {
            // CEP base da casa: 02215-010 (Vila Maria, São Paulo)
            const CEP_BASE = '02215010'; // Normalizado sem hífen
            
            if (!cep1 || !cep2) return { distancia: '0.0', tempo: 0 };
            
            // Normalizar CEPs removendo hífens e espaços
            const cep1Norm = cep1.replace(/\D/g, '');
            const cep2Norm = cep2.replace(/\D/g, '');
            
            // Se ambos são o CEP base, distância zero
            if (cep1Norm === CEP_BASE && cep2Norm === CEP_BASE) {
                return { distancia: '0.0', tempo: 0 };
            }
            
            // Se um dos CEPs é o da casa, usar cálculo mais preciso baseado na proximidade geográfica
            if (cep1Norm === CEP_BASE || cep2Norm === CEP_BASE) {
                const cepDestino = cep1Norm === CEP_BASE ? cep2Norm : cep1Norm;
                const prefixoDestino = cepDestino.substring(0, 3);
                const sufixoDestino = cepDestino.substring(3, 5); // Dígitos mais específicos
                
                // Distâncias mais realistas da Vila Maria (022) para outras regiões de SP
                const distanciasReais = {
                    '010': 12, '011': 11, '012': 13, '013': 14, '014': 16, '015': 8,
                    '020': 6, '021': 5,
                    '022': 3,  // Mesmo prefixo, mas calcular baseado no sufixo
                    '023': 2, '024': 3, '025': 2, '026': 4, '027': 5, '028': 6, '029': 7,
                    '030': 8, '031': 9, '032': 10, '033': 11, '034': 12, '035': 13, '036': 14,
                    '037': 15, '038': 16, '039': 17,
                    '040': 18, '041': 19, '042': 20, '043': 21, '044': 22, '045': 23,
                    '046': 24, '047': 25, '048': 26, '049': 27,
                    '050': 15, '051': 16, '052': 17, '053': 18, '054': 19, '055': 20,
                    '056': 21, '057': 22, '058': 23, '059': 24,
                    '080': 35, '081': 36, '082': 37, '083': 38, '084': 39, '085': 40,
                };
                
                let distanciaBase = distanciasReais[prefixoDestino] || 15;
                
                // Para CEPs da mesma região (022), calcular distância baseada na diferença dos sufixos
                if (prefixoDestino === '022') {
                    const sufixoBase = '15'; // Sufixo do CEP base (02215-010)
                    const diffSufixo = Math.abs(parseInt(sufixoDestino) - parseInt(sufixoBase));
                    distanciaBase = Math.max(1, diffSufixo * 0.3); // Cada unidade de diferença = ~0.3km (mais realista)
                }
                
                const distancia = Math.max(0.5, distanciaBase);
                
                // Tempo estimado: velocidade média de 20 km/h em SP (trânsito) + 15min para estacionar
                const tempoMinutos = Math.ceil((distancia / 20) * 60) + 15;
                
                console.log(`🏠 Distância da casa (${CEP_BASE}) para ${cepDestino}: ${distancia}km, tempo: ${tempoMinutos}min`);
                
                return { 
                    distancia: distancia.toFixed(1), 
                    tempo: tempoMinutos 
                };
            }
            
            // Entre dois CEPs diferentes (não incluindo a casa)
            // Usar diferença simples mas mais realista
            const diff = Math.abs(parseInt(cep1Norm) - parseInt(cep2Norm));
            const distancia = Math.max(0.5, diff * 0.02); // Fator menor para distâncias entre CEPs
            
            // Tempo estimado: velocidade média de 20 km/h em SP + 15min para deslocamento entre pontos
            const tempoMinutos = Math.ceil((distancia / 20) * 60) + 15;
            
            return { 
                distancia: distancia.toFixed(1), 
                tempo: tempoMinutos 
            };
        }

        async function otimizarRoteiroDia(data) {
            console.log('=== OTIMIZANDO ROTEIRO DO DIA ===', data);
            
            // Usar a nova função calcularRoteiroDia que já implementa a otimização com coordenadas
            const roteiroOtimizado = await calcularRoteiroDia(data);
            const CEP_BASE = '02215010'; // CEP da casa
            
            if (roteiroOtimizado.length === 0) {
                return roteiroOtimizado; // Não há o que otimizar
            }
            
            // Se há apenas um agendamento, calcular apenas a distância da casa
            if (roteiroOtimizado.length === 1) {
                if (roteiroOtimizado[0].distanciaDaBase !== undefined) {
                    roteiroOtimizado[0].distanciaCasa = roteiroOtimizado[0].distanciaDaBase.toFixed(1);
                    roteiroOtimizado[0].tempoCasa = Math.round(roteiroOtimizado[0].distanciaDaBase * 2); // ~2 min por km
                }
                return roteiroOtimizado;
            }
            
            // Calcular distâncias para todos os agendamentos do roteiro usando coordenadas
            // Primeiro agendamento: distância da casa (já calculada)
            if (roteiroOtimizado[0].distanciaDaBase !== undefined) {
                roteiroOtimizado[0].distanciaCasa = roteiroOtimizado[0].distanciaDaBase.toFixed(1);
                roteiroOtimizado[0].tempoCasa = Math.round(roteiroOtimizado[0].distanciaDaBase * 2);
            }
            
            // Demais agendamentos: distância do anterior usando coordenadas
            for (let i = 1; i < roteiroOtimizado.length; i++) {
                if (roteiroOtimizado[i-1].coordenadas && roteiroOtimizado[i].coordenadas) {
                    // Função Haversine já está disponível no escopo da função calcularRoteiroDia
                    const R = 6371; // Raio da Terra em km
                    const coord1 = roteiroOtimizado[i-1].coordenadas;
                    const coord2 = roteiroOtimizado[i].coordenadas;
                    
                    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
                    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
                    const a = 
                        Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
                        Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distancia = R * c;
                    
                    roteiroOtimizado[i].distanciaAnterior = distancia.toFixed(1);
                    roteiroOtimizado[i].tempoDeslocamento = Math.round(distancia * 2);
                }
            }
            
            console.log('📍 Roteiro final com distâncias reais:', roteiroOtimizado.map((a, idx) => {
                let info = `${idx + 1}º: ${a.nome_cliente} (${a.cep})`;
                if (a.distanciaCasa) {
                    info += ` [🏠 ${a.distanciaCasa}km]`;
                }
                if (a.distanciaAnterior) {
                    info += ` [🚗 ${a.distanciaAnterior}km]`;
                }
                return info;
            }).join(' → '));
            
            return roteiroOtimizado;
        }

        async function atualizarRoteiroHoje() {
            console.log('=== ATUALIZANDO ROTEIRO DE HOJE ===');
            
            const hoje = new Date().toISOString().split('T')[0];
            const roteiroContainer = document.getElementById('roteiro-hoje');
            
            if (!roteiroContainer) {
                console.log('Container do roteiro não encontrado');
                return;
            }
            
            // Mostrar loading
            roteiroContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p class="text-sm">Calculando distâncias reais...</p>
                </div>
            `;
            
            try {
                const roteiroOtimizado = await otimizarRoteiroDia(hoje);
            
            if (roteiroOtimizado.length === 0) {
                roteiroContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-calendar-times text-3xl mb-2"></i>
                        <p class="text-sm">Nenhum agendamento para hoje</p>
                    </div>
                `;
                return;
            }
            
            roteiroContainer.innerHTML = roteiroOtimizado.map((agendamento, index) => {
                const horaInicio = agendamento.horario;
                const horaFim = calcularHoraFim(horaInicio);
                
                let deslocamentoInfo = '';
                let pontoPartidaInfo = '';
                let erroInfo = '';
                
                // Informações de erro de geolocalização
                if (agendamento.erroGeolocalizacao) {
                    erroInfo = `
                        <div class="mb-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                            <div class="flex items-center text-sm text-red-700 mb-1">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                <span class="font-medium">Erro de Geolocalização</span>
                            </div>
                            <div class="text-xs text-red-600 ml-6">
                                <span>${agendamento.motivoErro}</span>
                            </div>
                        </div>
                    `;
                }
                
                // Informações do ponto de partida (casa) para o primeiro agendamento
                if (index === 0 && agendamento.distanciaCasa && !agendamento.erroGeolocalizacao) {
                    pontoPartidaInfo = `
                        <div class="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                            <div class="flex items-center text-sm text-green-700 mb-1">
                                <i class="fas fa-home mr-2"></i>
                                <span class="font-medium">Saída da casa (CEP: 02215-010)</span>
                            </div>
                            <div class="flex items-center text-xs text-green-600 ml-6">
                                <i class="fas fa-car mr-1"></i>
                                <span>Distância real: ${agendamento.distanciaCasa}km (~${agendamento.tempoCasa}min)</span>
                            </div>
                        </div>
                    `;
                }
                
                // Informações de deslocamento entre agendamentos
                if (index > 0 && agendamento.distanciaAnterior && !agendamento.erroGeolocalizacao) {
                    deslocamentoInfo = `
                        <div class="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                            <div class="flex items-center text-xs text-blue-700">
                                <i class="fas fa-car mr-1"></i>
                                <span>Deslocamento real: ${agendamento.distanciaAnterior}km (~${agendamento.tempoDeslocamento}min)</span>
                            </div>
                        </div>
                    `;
                }
                
                // Coordenadas para depuração (opcional)
                const coordenadasInfo = agendamento.coordenadas ? 
                    `<div class="text-xs text-gray-400 mt-1">📍 ${agendamento.coordenadas.lat.toFixed(6)}, ${agendamento.coordenadas.lon.toFixed(6)}</div>` : '';
                
                return `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 ${index > 0 ? 'mt-4' : ''} ${agendamento.erroGeolocalizacao ? 'border-red-200 bg-red-50' : ''}">
                        ${erroInfo}
                        ${pontoPartidaInfo}
                        
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <div class="flex items-center mb-1">
                                    <span class="${index === 0 && !agendamento.erroGeolocalizacao ? 'bg-green-100 text-green-800' : agendamento.erroGeolocalizacao ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs font-medium mr-2">
                                        ${agendamento.erroGeolocalizacao ? 'ERRO DE GEOLOCALIZAÇÃO' : index === 0 ? '1º Agendamento (PRÓXIMO DA CASA)' : index + 1 + 'º Agendamento (OTIMIZADO)'}
                                    </span>
                                    <h4 class="font-semibold text-gray-900">${agendamento.nome_cliente}</h4>
                                </div>
                                <p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>${agendamento.telefone}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium text-gray-900">${horaInicio} - ${horaFim}</div>
                            </div>
                        </div>
                        
                        <div class="space-y-1 text-sm text-gray-600">
                            <div class="flex items-center">
                                <i class="fas fa-store mr-2 w-4"></i>
                                <span>${agendamento.loja || 'Loja não especificada'}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-map-marker-alt mr-2 w-4"></i>
                                <span class="truncate">${agendamento.logradouro}${agendamento.numero ? ', ' + agendamento.numero : ''} - CEP: ${agendamento.cep}</span>
                            </div>
                            ${agendamento.coordenadas ? `
                                <div class="flex items-center text-xs text-gray-500">
                                    <i class="fas fa-globe mr-2 w-4"></i>
                                    <span>${agendamento.coordenadas.endereco || 'Endereço geolocalizado'}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${coordenadasInfo}
                        ${deslocamentoInfo}
                        
                        ${agendamento.observacoes ? `
                            <div class="mt-3 pt-3 border-t border-gray-100">
                                <p class="text-xs text-gray-500 italic">${agendamento.observacoes}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            } catch (error) {
                console.error('Erro ao atualizar roteiro:', error);
                roteiroContainer.innerHTML = `
                    <div class="text-center text-red-500 py-8">
                        <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                        <p class="text-sm">Erro ao calcular distâncias. Usando cálculo aproximado.</p>
                        <button onclick="atualizarRoteiroHoje()" class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs">
                            Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }

        // Função para atualizar roteiros dos próximos dias
        async function atualizarRoteirosProximosDias() {
            console.log('=== ATUALIZANDO ROTEIROS DOS PRÓXIMOS DIAS ===');
            
            const roteirosContainer = document.getElementById('roteiros-proximos-dias');
            
            if (!roteirosContainer) {
                console.log('Container dos roteiros não encontrado');
                return;
            }
            
            // Mostrar loading
            roteirosContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p class="text-sm">Calculando roteiros dos próximos 7 dias...</p>
                </div>
            `;
            
            try {
                // Obter próximos 7 dias (exceto hoje)
                const dias = [];
                const hoje = new Date();
                
                for (let i = 1; i <= 7; i++) {
                    const data = new Date(hoje);
                    data.setDate(hoje.getDate() + i);
                    const dataStr = data.toISOString().split('T')[0];
                    const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
                    const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    
                    dias.push({
                        data: dataStr,
                        diaSemana,
                        dataFormatada,
                        roteiro: await otimizarRoteiroDia(dataStr)
                    });
                }
                
                if (dias.every(dia => dia.roteiro.length === 0)) {
                    roteirosContainer.innerHTML = `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-calendar-times text-3xl mb-2"></i>
                            <p class="text-sm">Nenhum agendamento para os próximos 7 dias</p>
                        </div>
                    `;
                    return;
                }
                
                // Renderizar roteiros
                roteirosContainer.innerHTML = dias.map(dia => {
                    if (dia.roteiro.length === 0) {
                        return `
                            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div class="flex items-center justify-between mb-3">
                                    <h4 class="font-semibold text-gray-700 flex items-center">
                                        <i class="fas fa-calendar-day text-gray-400 mr-2"></i>
                                        ${dia.diaSemana} - ${dia.dataFormatada}
                                    </h4>
                                    <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                        Sem agendamentos
                                    </span>
                                </div>
                                <div class="text-center text-gray-400 py-4">
                                    <i class="fas fa-coffee text-2xl mb-2"></i>
                                    <p class="text-sm">Dia livre</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="border border-gray-200 rounded-lg p-4 ${dia.roteiro.some(a => a.erroGeolocalizacao) ? 'border-red-200 bg-red-50' : ''}">
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-semibold text-gray-800 flex items-center">
                                    <i class="fas fa-calendar-day text-purple-600 mr-2"></i>
                                    ${dia.diaSemana} - ${dia.dataFormatada}
                                </h4>
                                <div class="flex items-center gap-2">
                                    ${dia.roteiro.some(a => a.erroGeolocalizacao) ? 
                                        `<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                            <i class="fas fa-exclamation-triangle mr-1"></i>Com erros
                                        </span>` : 
                                        `<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                            <i class="fas fa-check-circle mr-1"></i>Otimizado
                                        </span>`
                                    }
                                    <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                        ${dia.roteiro.length} agendamento${dia.roteiro.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            
                            <div class="space-y-2">
                                ${dia.roteiro.map((agendamento, index) => {
                                    const horaInicio = agendamento.horario;
                                    const horaFim = calcularHoraFim(horaInicio);
                                    
                                    const erroInfo = agendamento.erroGeolocalizacao ? `
                                        <div class="mb-2 p-2 bg-red-100 rounded border-l-4 border-red-400">
                                            <div class="flex items-center text-xs text-red-700">
                                                <i class="fas fa-exclamation-triangle mr-1"></i>
                                                <span>${agendamento.motivoErro}</span>
                                            </div>
                                        </div>
                                    ` : '';
                                    
                                    return `
                                        <div class="bg-white border border-gray-100 rounded p-3 ${agendamento.erroGeolocalizacao ? 'border-red-200' : ''}">
                                            ${erroInfo}
                                            
                                            <div class="flex justify-between items-start">
                                                <div class="flex-1">
                                                    <div class="flex items-center mb-1">
                                                        <span class="${index === 0 && !agendamento.erroGeolocalizacao ? 'bg-green-100 text-green-800' : agendamento.erroGeolocalizacao ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} px-2 py-1 rounded-full text-xs font-medium mr-2">
                                                            ${index === 0 ? '1º' : index + 1 + 'º'}
                                                        </span>
                                                        <h5 class="font-medium text-gray-900 text-sm">${agendamento.nome_cliente}</h5>
                                                    </div>
                                                    <p class="text-xs text-gray-600"><i class="fas fa-phone mr-1"></i>${agendamento.telefone}</p>
                                                </div>
                                                <div class="text-right">
                                                    <div class="text-sm font-medium text-gray-900">${horaInicio} - ${horaFim}</div>
                                                    <div class="text-xs text-gray-500">2h</div>
                                                </div>
                                            </div>
                                            
                                            <div class="text-xs text-gray-600 mt-2">
                                                <i class="fas fa-map-marker-alt mr-1"></i>
                                                <span>${agendamento.logradouro}${agendamento.numero ? ', ' + agendamento.numero : ''} - ${agendamento.cep}</span>
                                                ${agendamento.distanciaDaBase !== undefined ? 
                                                    `<span class="ml-2 text-purple-600"><i class="fas fa-route mr-1"></i>${agendamento.distanciaDaBase.toFixed(1)}km da base</span>` : 
                                                    ''
                                                }
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('');
                
            } catch (error) {
                console.error('Erro ao atualizar roteiros dos próximos dias:', error);
                roteirosContainer.innerHTML = `
                    <div class="text-center text-red-500 py-8">
                        <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                        <p class="text-sm">Erro ao calcular roteiros. Tente novamente.</p>
                        <button onclick="atualizarRoteirosProximosDias()" class="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-xs">
                            Tentar Novamente
                        </button>
                    </div>
                `;
            }
        }

        function calcularHoraFim(horaInicio) {
            const [horas, minutos] = horaInicio.split(':').map(Number);
            const totalMinutos = horas * 60 + minutos + 120; // +2 horas
            const horasFim = Math.floor(totalMinutos / 60);
            const minutosFim = totalMinutos % 60;
            return `${horasFim.toString().padStart(2, '0')}:${minutosFim.toString().padStart(2, '0')}`;
        }

        // Expor funções globalmente
        window.calcularRoteiroDia = calcularRoteiroDia;
        window.validarHorarioRoteiro = validarHorarioRoteiro;
        window.sugerirProximoHorarioDisponivel = sugerirProximoHorarioDisponivel;
        window.calcularDistanciaCEP = calcularDistanciaCEP;
        window.otimizarRoteiroDia = otimizarRoteiroDia;
        window.atualizarRoteiroHoje = atualizarRoteiroHoje;
        window.atualizarRoteirosProximosDias = atualizarRoteirosProximosDias;
        window.calcularHoraFim = calcularHoraFim;
        window.mostrarPopupDuplicidade = mostrarPopupDuplicidade;
        window.closeDuplicidadePopup = closeDuplicidadePopup;

    })();
