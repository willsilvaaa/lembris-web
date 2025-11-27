document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "http://localhost:8000/api";

    // Configurações de Anotações
    const ANOTACOES_API_URL = `${API_BASE_URL}/anotacoes/`;
    const ULTIMAS_ANOTACOES_PAGE = "ultimas_anotacoes.html";

    // Configurações de Flashcards
    const CONJUNTOS_API_URL = `${API_BASE_URL}/conjuntos/`;
    const FLASHCARDS_API_URL = `${API_BASE_URL}/flashcards/`;
    const CONJUNTO_CARDS_PAGE = "conjunto_cards.html";

    // Variáveisglobais para navegação na tela de estudo
    let availableCards = [];
    let currentCardIndex = 0;

    // ============================= FUNÇÃO AUXILIAR DE AUTENTICAÇÃO =====================

    /**
     * @brief Cria um fetch com o token de autenticação no cabeçalho.
     */
    async function fetchAuthenticated(url, options = {}) {
        const token = localStorage.getItem("user_token");

        if (!token) {
            // Se não houver token, força o redirecionamento para login
            alert("Sessão expirada ou não autenticada. Faça login novamente.");
            window.location.href = "index.html"; 
            throw new Error("Token de autenticação não encontrado.");
        }

        options.headers = options.headers || {};
        
        // Adiciona o cabeçalho Authorization: Token <key>
        options.headers['Authorization'] = `Token ${token}`;
        
        // Garante Content-Type para métodos com corpo
        if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
            options.headers['Content-Type'] = 'application/json';
        }

        return fetch(url, options);
    }
    
    window.fetchAuthenticated = fetchAuthenticated; // Torna global para uso em outros arquivos/eventos

    /**
     * @brief 
     */
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        const results = regex.exec(location.search);
        return results ? decodeURIComponent(results[1]) : null;
    }

    // ============================= LOGIN E CADASTRO =====================

    const loginForm = document.getElementById("loginForm");

    const usernameOrEmailInput = document.getElementById("username_or_email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("errorMessage");

    if (loginForm && usernameOrEmailInput && passwordInput) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const usernameOrEmail = usernameOrEmailInput.value.trim();
            const password = passwordInput.value;

            if (errorMessage) {
                errorMessage.style.display = "none";
                errorMessage.textContent = "";
            }

            if (!usernameOrEmail || !password) {
                if (errorMessage) {
                    errorMessage.textContent =
                        "Por favor, preencha o e-mail/usuário e a senha.";
                    errorMessage.style.display = "block";
                }
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/login_usuario/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username_or_email: usernameOrEmail,
                        password: password,
                    }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // *** NOVO: Salva o token retornado pela API no LocalStorage ***
                    if (data.token) {
                        localStorage.setItem("user_token", data.token);
                    } else {
                        throw new Error("API não retornou o Token.");
                    }
                    
                    localStorage.setItem(
                        "usuario_logado",
                        JSON.stringify({
                            nome: data.usuario,
                            email: data.email,
                        })
                    );
                    window.location.href = "home.html";
                } else {
                    const msg = data.message || "Usuário ou senha incorretos.";
                    console.error("Erro de Login na API:", msg);
                    if (errorMessage) {
                        errorMessage.textContent = msg;
                        errorMessage.style.display = "block";
                    }
                }
            } catch (error) {
                console.error("Erro ao logar (Verifique o servidor/CORS):", error);
                if (errorMessage) {
                    errorMessage.textContent =
                        "Erro de comunicação com o servidor. Verifique o console.";
                    errorMessage.style.display = "block";
                }
            }
        });
    }
    
    // Funçao de LOGOUT simples (opcional)
    window.logout = function() {
        localStorage.removeItem("user_token");
        localStorage.removeItem("usuario_logado");
        window.location.href = "index.html";
    }

    // --------------------------- RECUPERAR SENHA (SEM MUDANÇA) ------------------------------------
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    if (forgotPasswordForm) {
        const emailInput = document.getElementById("email");
        const statusMessage = document.getElementById("status-message");
        const SIMULATED_REGISTERED_EMAILS = [
            "aluno@lembris.com",
            "teste@duplicado.com",
            "gabrieloliveira@gmail.com",
        ];

        forgotPasswordForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = emailInput.value.trim();
            statusMessage.style.display = "block";
            statusMessage.classList.remove("success-message", "error-message");

            if (!email) {
                statusMessage.textContent = "Por favor, preencha o campo de e-mail.";
                statusMessage.classList.add("error-message");
                return;
            }

            if (SIMULATED_REGISTERED_EMAILS.includes(email)) {
                statusMessage.textContent =
                    "Link de redefinição enviado! Verifique seu e-mail.";
                statusMessage.classList.add("success-message");
            } else {
                statusMessage.textContent =
                    "Este e-mail não está cadastrado em nossa base.";
                statusMessage.classList.add("error-message");
            }
        });
    }


    // ===================== SISTEMA DE ANOTAÇÕES (CRUD) ==================


    /**
     * @brief Envia anotação para a API (criar e atualizar) e redireciona.
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function salvarAnotacaoAPI(titulo, conteudo, anotacaoId = null) {
        const method = anotacaoId ? "PUT" : "POST";
        const url = anotacaoId
            ? `${ANOTACOES_API_URL}${anotacaoId}/`
            : ANOTACOES_API_URL;

        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(url, {
                method: method,
                // Headers Content-Type já injetado em fetchAuthenticated
                body: JSON.stringify({ titulo, conteudo }),
            });

            if (!response.ok) {
                let errorMessage = `Erro ${response.status} ao salvar anotação.`;
                try {
                    const errorData = await response.json();
                    errorMessage +=
                        "\nDetalhes do Erro:\n" + JSON.stringify(errorData, null, 2);
                } catch (e) {
                    errorMessage +=
                        "\nDetalhes não puderam ser lidos (Verifique se a API está retornando JSON).";
                }
                throw new Error(errorMessage);
            }

            alert(`Anotação ${anotacaoId ? "atualizada" : "criada"} com sucesso!`);
            window.location.href = ULTIMAS_ANOTACOES_PAGE;
        } catch (error) {
            console.error("Erro na API:", error);
            alert(
                `Falha ao salvar. Verifique o console do navegador.\n${error.message}`
            );
        }
    }

    window.deletarAnotacaoAPI = deletarAnotacaoAPI;

    /**
     * @brief 
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function deletarAnotacaoAPI(id, titulo) {
        if (!confirm(`Deletar "${titulo}"? Essa ação é irreversível.`)) {
            return;
        }

        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(`${ANOTACOES_API_URL}${id}/`, {
                method: "DELETE",
            });

            if (response.status === 204) {
                alert("Anotação deletada!");
                document
                    .querySelector(`.anotacao-card-item[data-id="${id}"]`)
                    ?.remove();
            } else if (!response.ok) {
                throw new Error(`Erro ao deletar: Status ${response.status}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao deletar anotação.");
        }
    }

    /**
     * @brief 
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function getAnotacaoAPI(id) {
        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(`${ANOTACOES_API_URL}${id}/`);
            if (!response.ok) throw new Error("Anotação não encontrada.");
            return await response.json();
        } catch (e) {
            console.error(e);
            alert("Erro ao carregar anotação.");
            return null;
        }
    }

    /**
     * @brief 
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function carregarAnotacoes() {
        const container = document.querySelector(".lista-anotacoes-container");
        if (!container) return;

        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(ANOTACOES_API_URL);
            
            // Tratamento de erro 401 que pode vir como resposta.ok=false
            if (!response.ok) {
                throw new Error(`Falha ao carregar anotações. Status: ${response.status}`);
            }
            
            const anotacoes = await response.json();

            container.innerHTML = "";

            if (anotacoes.length === 0) {
                container.innerHTML =
                    '<p class="no-notes-message">Nenhuma anotação ainda.</p>';
                return;
            }

            anotacoes.forEach((a) => {
                const data = new Date(a.data_criacao).toLocaleDateString("pt-BR");
                const preview =
                    a.conteudo.substring(0, 100) + (a.conteudo.length > 100 ? "..." : "");

                container.innerHTML += `
                    <div class="anotacao-card-item" data-id="${a.id}">
                        <div class="anotacao-card-header">
                            <h3 class="anotacao-card-title">
                                <a href="criar_anotacao.html?id=${a.id}">${
                    a.titulo
                }</a>
                            </h3>
                            <span class="anotacao-card-date">${data}</span>
                        </div>
                        <p class="anotacao-card-preview">${preview}</p>

                        <div class="anotacao-card-actions">
                            <a href="criar_anotacao.html?id=${
                    a.id
                }" class="action-btn edit-btn">
                                <span class="material-icons">edit</span>
                            </a>

                            <button class="action-btn delete-btn"
                                onclick="deletarAnotacaoAPI(${
                    a.id
                }, '${a.titulo.replace(/'/g, "\\'")}')">
                                <span class="material-icons">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        } catch (error) {
            console.error(error);
            container.innerHTML =
                "<p class='error-message'>Erro ao carregar anotações.</p>";
        }
    }

    if (document.querySelector(".lista-anotacoes-wrapper")) {
        carregarAnotacoes();
    }

    const anotacaoForm = document.getElementById("formAnotacao");
    if (anotacaoForm) {
        const anotacaoId = getUrlParameter("id");
        const tituloInput = anotacaoForm.querySelector('input[name="titulo"]');
        const conteudoInput = anotacaoForm.querySelector(
            'textarea[name="conteudo"]'
        );
        const saveButton = anotacaoForm.querySelector(".save-footer-btn");

        if (anotacaoId) {
            document.querySelector(".action-title").textContent = "Editar Anotação";
            saveButton.innerHTML =
                '<span class="material-icons">edit</span> Atualizar Anotação';

            getAnotacaoAPI(anotacaoId).then((a) => {
                if (a) {
                    tituloInput.value = a.titulo;
                    conteudoInput.value = a.conteudo;
                }
            });
        }

        // Submissão do Formulário
        anotacaoForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const titulo = tituloInput.value;
            const conteudo = conteudoInput.value;

            if (!titulo || !conteudo) {
                alert("Preencha todos os campos.");
                return;
            }

            salvarAnotacaoAPI(titulo, conteudo, anotacaoId);
        });
    }

    // ====================== SISTEMA DE FLASHCARDS =======================

    const formCriarFlashcard = document.getElementById("formCriarFlashcard");

    if (formCriarFlashcard) {
        formCriarFlashcard.addEventListener("submit", async (event) => {
            event.preventDefault();

            const nomeConjunto = document.getElementById("nome_conjunto").value;
            const pergunta = document.getElementById("pergunta").value;
            const resposta = document.getElementById("resposta").value;

            if (!nomeConjunto || !pergunta || !resposta) {
                alert("Preencha o nome do conjunto, a pergunta e a resposta.");
                return;
            }

            try {
                let conjuntoId = null;

                // Cria o Conjunto (*** MUDANÇA: Usa fetchAuthenticated ***)
                const conjuntoResponse = await fetchAuthenticated(CONJUNTOS_API_URL, {
                    method: "POST",
                    // Headers Content-Type já injetado em fetchAuthenticated
                    body: JSON.stringify({ nome: nomeConjunto, favorito: false }),
                });

                if (!conjuntoResponse.ok) {
                    const errorData = await conjuntoResponse.json();
                    console.error("Erro ao criar conjunto:", errorData);
                    throw new Error(
                        "Falha ao criar o conjunto. Detalhes: " +
                        JSON.stringify(errorData, null, 2)
                    );
                }

                const novoConjunto = await conjuntoResponse.json();
                conjuntoId = novoConjunto.id;

                // Cria o primeiro Flashcard associado ao conjunto (*** MUDANÇA: Usa fetchAuthenticated ***)
                const flashcardResponse = await fetchAuthenticated(FLASHCARDS_API_URL, {
                    method: "POST",
                    // Headers Content-Type já injetado em fetchAuthenticated
                    body: JSON.stringify({
                        conjunto: conjuntoId,
                        pergunta: pergunta,
                        resposta: resposta,
                        nivel_memorizacao: 0,
                    }),
                });

                if (!flashcardResponse.ok) {
                    const errorData = await flashcardResponse.json();
                    console.error("Erro ao criar Flashcard:", errorData);
                    throw new Error(
                        "Conjunto criado (ID: " +
                        conjuntoId +
                        "), mas falha ao adicionar o primeiro card. Detalhes: " +
                        JSON.stringify(errorData, null, 2)
                    );
                }

                // Sucesso e Redirecionamento
                alert(`Conjunto "${nomeConjunto}" criado com o primeiro flashcard!`);
                window.location.href = CONJUNTO_CARDS_PAGE;
            } catch (error) {
                console.error("Erro na Requisição:", error);
                alert(
                    `Erro na criação: ${error.message}. Verifique o console para detalhes.`
                );
            }
        });
    }

    // ************ aqui é a RENDERIZAÇÃO E LISTAGEM ************

    function createCardHTML(conjunto) {
        const isFavorited = conjunto.favorito;
        const favoriteIconClass = isFavorited ? "favorited" : "";
        const favoriteIconText = isFavorited ? "star" : "star_border";

        // NOTA: 'num_cards' e 'data_criacao' virão do backend. O valor 5 e new Date() é fallback.
        const numCards = conjunto.num_cards || 5;
        const dataCriacao = new Date(conjunto.data_criacao || new Date());
        const hoje = new Date();
        const diffTime = Math.abs(hoje - dataCriacao);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return `
            <div class="set-card" 
                data-id="${conjunto.id}" 
                data-favorito="${isFavorited}"
                data-days-old="${diffDays}"
            >
                <div class="set-card-content" onclick="window.location.href='estudar_flashcards.html?conjunto_id=${conjunto.id}'">
                    <h3 class="set-card-title">${conjunto.nome}</h3>
                    <p class="set-card-info">${numCards} cards</p>
                </div>
                <div class="set-card-actions">
                    <span class="material-icons set-card-action-icon edit-icon" title="Editar">edit</span>
                    <span class="material-icons set-card-action-icon delete-icon" title="Excluir" data-id="${conjunto.id}">delete</span>
                    <span class="material-icons set-card-action-icon favorite-icon ${favoriteIconClass}" title="Favoritar" data-id="${conjunto.id}">
                        ${favoriteIconText}
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * @brief 
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function loadConjuntoCards() {
        const gridContainer = document.getElementById("flashcard-grid");
        if (!gridContainer) return;

        gridContainer.innerHTML = "Carregando conjuntos...";

        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(CONJUNTOS_API_URL);
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: Falha ao buscar conjuntos.`);
            }

            const conjuntos = await response.json();

            if (conjuntos.length === 0) {
                gridContainer.innerHTML =
                    '<p class="text-center text-xl text-gray-500">Nenhum conjunto de flashcards encontrado. Crie um novo!</p>';
                return;
            }

            // Limpa e Adiciona os cards
            gridContainer.innerHTML = conjuntos.map(createCardHTML).join("");

            initializeFlashcardLogic();
        } catch (error) {
            console.error("Erro ao carregar conjuntos:", error);
            gridContainer.innerHTML = `<p class="text-red-500">Erro ao carregar dados: ${error.message}</p>`;
        }
    }

    // ************ aqui é FILTRAGEM E FAVORITOS ************

    function initializeFlashcardLogic() {
        const filterButtons = document.querySelectorAll(".filter-button");
        const cards = document.querySelectorAll("#flashcard-grid .set-card");
        const favoriteIcons = document.querySelectorAll(".favorite-icon");
        const deleteIcons = document.querySelectorAll(".delete-icon");

        // A lógica de Favoritar (*** MUDANÇA: Usa fetchAuthenticated ***)
        favoriteIcons.forEach((icon) => {
            icon.addEventListener("click", async (event) => {
                event.stopPropagation();
                const card = icon.closest(".set-card");
                const cardId = card.dataset.id;
                const isFavorited = card.getAttribute("data-favorito") === "true";
                const novoStatus = !isFavorited;

                try {
                    // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
                    const response = await fetchAuthenticated(`${CONJUNTOS_API_URL}${cardId}/`, {
                        method: "PATCH",
                        // Headers Content-Type já injetado em fetchAuthenticated
                        body: JSON.stringify({ favorito: novoStatus }),
                    });

                    if (!response.ok)
                        throw new Error("Falha ao atualizar favorito na API.");

                    card.setAttribute("data-favorito", novoStatus.toString());
                    icon.textContent = novoStatus ? "star" : "star_border";
                    icon.classList.toggle("favorited", novoStatus);

                    const activeFilter =
                        document.querySelector(".filter-button.active")?.dataset.filter ||
                        "all";
                    applyFilter(activeFilter);
                } catch (error) {
                    console.error("Erro ao favoritar/desfavoritar:", error);
                    alert("Não foi possível atualizar o status de favorito.");
                }
            });
        });

        // Lógica de Deletar Conjunto (*** MUDANÇA: Usa fetchAuthenticated ***)
        deleteIcons.forEach((icon) => {
            icon.addEventListener("click", async (event) => {
                event.stopPropagation();
                const cardId = icon.dataset.id;
                const cardElement = icon.closest(".set-card");
                const cardName =
                    cardElement.querySelector(".set-card-title").textContent;

                if (
                    !confirm(
                        `Tem certeza que deseja deletar o conjunto "${cardName}"? Esta ação é irreversível.`
                    )
                ) {
                    return;
                }

                try {
                    // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
                    const response = await fetchAuthenticated(`${CONJUNTOS_API_URL}${cardId}/`, {
                        method: "DELETE",
                    });

                    if (response.status === 204) {
                        alert(`Conjunto "${cardName}" deletado com sucesso.`);
                        cardElement.remove();
                    } else {
                        throw new Error(`Falha ao deletar. Status: ${response.status}`);
                    }
                } catch (error) {
                    console.error("Erro ao deletar conjunto:", error);
                    alert(`Não foi possível deletar o conjunto: ${error.message}`);
                }
            });
        });

        // Lógica de Filtragem (SEM MUDANÇA)
        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                filterButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");
                applyFilter(button.dataset.filter);
            });
        });

        function applyFilter(filter) {
            cards.forEach((card) => {
                const isFavorited = card.getAttribute("data-favorito") === "true";
                const daysOld = parseInt(card.getAttribute("data-days-old")) || 0;

                let shouldBeHidden = false;

                if (filter === "favorites") {
                    shouldBeHidden = !isFavorited;
                } else if (filter === "recent") {
                    shouldBeHidden = daysOld > 7;
                } else if (filter === "all") {
                    shouldBeHidden = false;
                }

                card.classList.toggle("hidden", shouldBeHidden);
            });
        }

        const initialFilter =
            document.querySelector(".filter-button.active")?.dataset.filter || "all";
        applyFilter(initialFilter);
    }

    // =================== LÓGICA DE ESTUDO DE FLASHCARDS =================

    /**
     * @brief 
     */
    function displayCurrentCard() {
        const cardFrontContent = document.getElementById("card_content_front");
        const cardBackContent = document.getElementById("card_content_back");
        const cardIdField = document.getElementById("current_card_id");
        const contadorCards = document.getElementById("text_contador_cards");
        const cardFlashcard = document.getElementById("card_flashcard");

        const btnPrev = document.getElementById("btn-prev-card");
        const btnNext = document.getElementById("btn-next-card");

        // Se a tela estiver virada, desvira ao trocar
        if (cardFlashcard && cardFlashcard.classList.contains("flipped")) {
            cardFlashcard.classList.remove("flipped");
        }

        if (availableCards.length === 0) {
            cardFrontContent.innerHTML =
                "</h3><p>Nenhum card disponível para estudo ou revisão hoje.</p>";
            if (contadorCards) contadorCards.textContent = "0 flashcards disponíveis";
            if (btnPrev) btnPrev.disabled = true;
            if (btnNext) btnNext.disabled = true;
            document.querySelector(".feedback-buttons")?.remove();
            document.querySelector(".card-actions")?.classList.add("hidden");
            document
                .querySelector(".flex.justify-between.w-full.mt-4.gap-3")
                ?.classList.add("hidden");
            return;
        }

        const currentCard = availableCards[currentCardIndex];

        // Atualiza o conteúdo da frente e de trás
        if (cardFrontContent) cardFrontContent.textContent = currentCard.pergunta;
        if (cardBackContent) cardBackContent.textContent = currentCard.resposta;

        if (cardIdField) cardIdField.value = currentCard.id;

        // Atualiza o contador 1, 2, 3...
        if (contadorCards) {
            contadorCards.textContent = `${currentCardIndex + 1} / ${
                availableCards.length
            } cards`;
        }


        if (btnPrev) btnPrev.disabled = currentCardIndex === 0;
        if (btnNext)
            btnNext.disabled = currentCardIndex === availableCards.length - 1;
    }

    /**
     * @brief 
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function carregarCardsParaEstudo() {
        const conjuntoId = getUrlParameter("conjunto_id");
        const tituloTela = document.querySelector(".screen-title");

        if (!conjuntoId) {
            console.error("Erro: Conjunto ID não encontrado.");
            return;
        }

        const STUDY_API_URL = `${CONJUNTOS_API_URL}${conjuntoId}/cards_para_estudar/`;

        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(STUDY_API_URL);
            
            if (!response.ok) {
                throw new Error(
                    "Falha ao carregar cards para estudo. Verifique a API."
                );
            }

            availableCards = await response.json();
            currentCardIndex = 0;

            if (availableCards.length > 0 && tituloTela) {
                // Aqui o primeiro card criado vai conter o nome do conjunto
                // Nota: Assumindo que a API retorna 'conjunto_nome' no objeto Flashcard.
                tituloTela.textContent = `Estudando: ${
                    availableCards[0].conjunto_nome || "Conjunto"
                }`;
            }

            // Exibe o primeiro card (ou a mensagem de nenhum card)
            displayCurrentCard();
        } catch (error) {
            console.error("Erro ao carregar cards:", error);
            const cardFrontContent = document.getElementById("card_content_front");
            if (cardFrontContent)
                cardFrontContent.textContent = `Erro ao carregar: ${error.message}`;
        }
    }


    // Funções de feedback (Avalia e avança)
    async function processarFeedback(nivel) {
        const currentCard = availableCards[currentCardIndex];
        const cardId = currentCard ? currentCard.id : null;
        let avaliacao_texto;
        
        if (nivel === 0) avaliacao_texto = 'ruim';
        else if (nivel === 1) avaliacao_texto = 'ok';
        else if (nivel === 2) avaliacao_texto = 'perfeito';
        else return console.error("Nível de avaliação inválido.");

        if (!cardId)
            return console.error("Erro: ID do card não encontrado para avaliação.");

        try {
            // *** MUDANÇA: Envia a avaliação para a API (fetchAuthenticated) ***
            const response = await fetchAuthenticated(`${FLASHCARDS_API_URL}${cardId}/avaliar/`, {
                method: "POST",
                body: JSON.stringify({ avaliacao: avaliacao_texto }),
            });
            
            if (!response.ok) {
                throw new Error(`Falha ao avaliar o card. Status: ${response.status}`);
            }
            
            // Opcional: const result = await response.json();
        } catch (error) {
            console.error("Erro ao processar feedback na API:", error);
            alert("Falha ao registrar a avaliação. O card será mantido na lista.");
            return; // Sai sem remover o card da lista local
        }
        
        // Remove o card do array (simulando que ele foi revisado e saiu da fila)
        availableCards.splice(currentCardIndex, 1);

        // Ajusta o índice para o próximo card (ou o último da nova lista)
        if (
            currentCardIndex >= availableCards.length &&
            availableCards.length > 0
        ) {
            currentCardIndex = availableCards.length - 1;
        } else if (availableCards.length === 0) {
            currentCardIndex = 0; // Se a lista estiver vazia
        }

        // Exibe o próximo card
        displayCurrentCard();
    }

    const cardFlashcard = document.getElementById("card_flashcard");
    if (cardFlashcard) {
        const cardInner = cardFlashcard.querySelector(".card-inner");

        // Lógica para virar o card ao clicar no corpo
        if (cardInner) {
            cardInner.addEventListener("click", () => {
                cardFlashcard.classList.toggle("flipped");
            });
        }

        // Seletores reais dos botões de Ação
        const btnAdd = document.querySelector("#btn-add-card");
        const btnDelete = document.querySelector("#btn-delete-card");
        const btnEdit = document.querySelector("#btn-edit-card");

        // Botões de Navegação (SEM MUDANÇA)
        const btnPrev = document.getElementById("btn-prev-card");
        const btnNext = document.getElementById("btn-next-card");

        if (btnPrev) {
            btnPrev.addEventListener("click", (event) => {
                event.stopPropagation(); // Evita virar o card
                if (currentCardIndex > 0) {
                    currentCardIndex--;
                    displayCurrentCard();
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener("click", (event) => {
                event.stopPropagation(); // Evita virar o card
                if (currentCardIndex < availableCards.length - 1) {
                    currentCardIndex++;
                    displayCurrentCard();
                }
            });
        }

        // ADICIONAR NOVO FLASHCARD (*** MUDANÇA: Usa fetchAuthenticated ***)
        if (btnAdd) {
            btnAdd.addEventListener("click", async () => {
                const conjuntoId = getUrlParameter("conjunto_id");
                if (!conjuntoId) return alert("Erro: ID do conjunto não encontrado.");

                const novaPergunta = prompt(
                    "Digite a nova PERGUNTA para este conjunto:"
                );
                if (!novaPergunta) return;

                const novaResposta = prompt("Digite a RESPOSTA para o card:");
                if (!novaResposta) return;

                try {
                    // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
                    const response = await fetchAuthenticated(FLASHCARDS_API_URL, {
                        method: "POST",
                        body: JSON.stringify({
                            conjunto: conjuntoId,
                            pergunta: novaPergunta,
                            resposta: novaResposta,
                            nivel_memorizacao: 0,
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("Erro ao adicionar card:", errorData);
                        alert("Falha ao adicionar novo flashcard. Verifique o console.");
                        return;
                    }

                    alert(
                        "Novo flashcard adicionado com sucesso ao conjunto! Recarregando..."
                    );
                    window.location.reload();
                } catch (error) {
                    console.error("Erro na Requisição de adicionar card:", error);
                    alert("Erro de comunicação com a API.");
                }
            });
        }

        // Seção: ELIMINAR FLASHCARD (*** MUDANÇA: Usa fetchAuthenticated ***)
        if (btnDelete) {
            btnDelete.addEventListener("click", async () => {
                const cardIdField = document.getElementById("current_card_id");
                const cardId = cardIdField ? cardIdField.value : null;

                if (!cardId)
                    return alert(
                        "Nenhum card selecionado para deletar. Recarregue a página."
                    );

                if (!confirm("Tem certeza que deseja ELIMINAR este flashcard?")) return;

                try {
                    // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
                    const response = await fetchAuthenticated(`${FLASHCARDS_API_URL}${cardId}/`, {
                        method: "DELETE",
                    });

                    if (response.status === 204) {
                        alert("Flashcard deletado com sucesso!");

                        // Remove da lista local e exibe o próximo card
                        availableCards.splice(currentCardIndex, 1);
                        if (
                            currentCardIndex >= availableCards.length &&
                            availableCards.length > 0
                        ) {
                            currentCardIndex = availableCards.length - 1;
                        } else if (availableCards.length === 0) {
                            currentCardIndex = 0;
                        }
                        displayCurrentCard();
                    } else if (!response.ok) {
                        throw new Error(`Falha ao deletar: Status ${response.status}`);
                    }
                } catch (error) {
                    console.error("Erro ao deletar flashcard:", error);
                    alert("Erro ao deletar flashcard. Verifique o console.");
                }
            });
        }

        // Seção: EDITAR FLASHCARD (SEM MUDANÇA no handler, a edição está abaixo)
        if (btnEdit) {
            btnEdit.addEventListener("click", () => {
                const cardIdField = document.getElementById("current_card_id");
                const cardId = cardIdField ? cardIdField.value : null;

                if (!cardId)
                    return alert(
                        "Nenhum card selecionado para editar. Recarregue a página."
                    );

                // Redireciona para a página de edição
                window.location.href = `editar_flashcard.html?card_id=${cardId}`;
            });
        }

        // Seção: AVALIAÇÃO (BOTÕES)
        const btnRuim = document.querySelector(".btn-ruim");
        const btnOk = document.querySelector(".btn-ok");
        const btnPerfeito = document.querySelector(".btn-perfeito");

        // Os valores são 0 ('ruim'), 1 ('ok'), 2 ('perfeito')
        if (btnRuim) btnRuim.addEventListener("click", () => processarFeedback(0));
        if (btnOk) btnOk.addEventListener("click", () => processarFeedback(1));
        if (btnPerfeito)
            btnPerfeito.addEventListener("click", () => processarFeedback(2));
    }

    // ==================== LÓGICA DE EDIÇÃO DE FLASHCARD =================

    /**
     * @brief Envia as alterações do flashcard para a API usando PATCH.
     * *** MUDANÇA: Usa fetchAuthenticated ***
     */
    async function salvarEdicaoFlashcardAPI(cardId, pergunta, resposta) {
        try {
            // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
            const response = await fetchAuthenticated(`${FLASHCARDS_API_URL}${cardId}/`, {
                method: "PATCH",
                // Headers Content-Type já injetado em fetchAuthenticated
                body: JSON.stringify({
                    pergunta: pergunta,
                    resposta: resposta,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro ao salvar card:", errorData);
                throw new Error("Falha ao salvar as alterações do flashcard.");
            }

            alert("Flashcard atualizado com sucesso!");
            window.location.href = CONJUNTO_CARDS_PAGE;
        } catch (error) {
            console.error("Erro na Requisição de edição:", error);
            const messageBox = document.getElementById("edit-message");
            if (messageBox) {
                messageBox.textContent = `Erro ao salvar: ${error.message}`;
                messageBox.classList.remove("hidden");
            }
        }
    }

    // Handler para o formulário de Edição
    const formEditarFlashcard = document.getElementById("formEditarFlashcard");
    if (formEditarFlashcard) {
        const cardId = getUrlParameter("card_id");
        const perguntaInput = document.getElementById("pergunta_edit");
        const respostaInput = document.getElementById("resposta_edit");
        const cardIdField = document.getElementById("edit_card_id");
        const messageBox = document.getElementById("edit-message");

        // Carregar dados do Flashcard para edição (*** MUDANÇA: Usa fetchAuthenticated ***)
        async function carregarCardParaEdicao(id) {
            try {
                // *** SUBSTITUIÇÃO: fetch() por fetchAuthenticated() ***
                const response = await fetchAuthenticated(`${FLASHCARDS_API_URL}${id}/`);
                
                if (!response.ok) {
                    throw new Error("Falha ao carregar dados do card.");
                }
                const card = await response.json();

                perguntaInput.value = card.pergunta;
                respostaInput.value = card.resposta;
            } catch (e) {
                console.error(e);
                alert("Erro ao carregar card para edição.");
                window.history.back();
            }
        }

        if (cardId) {
            cardIdField.value = cardId;
            carregarCardParaEdicao(cardId);
        } else {
            alert("ID do card não especificado para edição.");
            window.history.back();
            return;
        }

        // Evento de Submissão para Salvar
        formEditarFlashcard.addEventListener("submit", (event) => {
            event.preventDefault();

            const cardToUpdateId = cardIdField.value;
            const pergunta = perguntaInput.value.trim();
            const resposta = respostaInput.value.trim();

            if (!pergunta || !resposta) {
                messageBox.textContent = "Preencha a pergunta e a resposta.";
                messageBox.classList.remove("hidden");
                return;
            }

            messageBox.classList.add("hidden");
            salvarEdicaoFlashcardAPI(cardToUpdateId, pergunta, resposta);
        });
    }

    // --------------------------------------------------------------------
    // ====================== Chamadas Iniciais ===========================
    // --------------------------------------------------------------------

    // Chamada para carregar a lista de conjuntos na tela 'conjunto_cards.html'
    if (document.getElementById("flashcard-grid")) {
        loadConjuntoCards();
    }

    // Chamada para carregar o primeiro card na tela 'estudar_flashcards.html'
    if (document.getElementById("card_flashcard")) {
        carregarCardsParaEstudo();
    }
});